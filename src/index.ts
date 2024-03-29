import * as path from 'path'
import * as os from 'os'
import * as core from '@actions/core'
import * as tc from '@actions/tool-cache'

export abstract class Installer {
  protected osPlat: string
  protected osArch: string
  protected name: string
  protected binPath: string
  private authHeader: string

  constructor(name: string, binPath: string = '.', authHeader = '') {
    this.osPlat = os.platform()
    this.osArch = os.arch()
    this.name = name
    this.binPath = binPath
    this.authHeader = authHeader
  }

  // implement it
  abstract getDownloadUrlByVersion(version: string): string

  async acquire(version: string): Promise<string> {
    const downloadUrl: string = this.getDownloadUrlByVersion(version)
    let downloadPath: string | null = null

    try {
      downloadPath = await tc.downloadTool(downloadUrl, undefined, this.authHeader)
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
      core.info('Tool cache not found, acquire new')
      toolPath = await this.acquire(version)
    } else {
      core.info(`Tool is cached under ${toolPath}`)
    }

    toolPath = path.join(toolPath, this.binPath)

    core.info(`Add path: ${toolPath}`)
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
}
