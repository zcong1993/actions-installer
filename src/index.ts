import * as path from 'path'
import * as os from 'os'
import * as io from '@actions/io';
import * as core from '@actions/core'
import * as tc from '@actions/tool-cache'

export function getHomeDir(): string {
  let homedir = '';

  if (process.platform === 'win32') {
    homedir = process.env['USERPROFILE'] || 'C:\\';
  } else {
    homedir = `${process.env.HOME}`;
  }

  core.debug(`homeDir: ${homedir}`);

  return homedir;
}

export async function createBinDir(name: string): Promise<string> {
  const binDir = path.join(getHomeDir(), name);
  await io.mkdirP(binDir);
  core.addPath(binDir);
  core.debug(`binDir: ${binDir}`);
  return binDir;
}

export abstract class Installer {
  protected osPlat: string
  protected osArch: string
  protected name: string
  protected binPath: string

  constructor(name: string, binPath?: string) {
    this.osPlat = os.platform()
    this.osArch = os.arch()
    this.name = name
    this.binPath = binPath
  }

  // implement it
  abstract getDownloadUrlByVersion(version: string): string

  async acquire(version: string): Promise<string> {
    const downloadUrl: string = this.getDownloadUrlByVersion(version)
    let downloadPath: string | null = null

    try {
      downloadPath = await tc.downloadTool(downloadUrl)
    } catch (error) {
      core.debug(error)
      throw new Error(`Failed to download version ${version}: ${error}`)
    }

    const extPath = await this.extract(downloadPath)
    //
    // Install into the local tool cache - node extracts with a root folder that matches the fileName downloaded
    //
    const v = this.normalizeVersion(version)
    return await tc.cacheDir(extPath, this.name, v)
  }

  async getTools(version: string) {
    // check cache
    let toolPath: string
    toolPath = tc.find(this.name, this.normalizeVersion(version))

    if (!toolPath) {
      toolPath = await this.acquire(version)
      core.debug(`Tool is cached under ${toolPath}`)
    }

    toolPath = path.join(toolPath, this.binPath)
    core.addPath(toolPath)
  }

  normalizeVersion(version: string): string {
    const versionPart = version.split('.')
    if (versionPart[1] == null) {
      // append minor and patch version if not available
      return version.concat('.0.0')
    }
    if (versionPart[2] == null) {
      // append patch version if not available
      return version.concat('.0')
    }
    return version
  }

  async extract(archivePath: string): Promise<string> {
    if (archivePath.endsWith('.7z')) {
      return tc.extract7z(archivePath)
    }

    if (archivePath.endsWith('.zip')) {
      return tc.extractZip(archivePath)
    }

    return tc.extractTar(archivePath)
  }

  async ensureBinDir() {
    if (!this.binPath) {
      this.binPath = await createBinDir(this.name)
    }
  }
}
