import * as path from 'path'
import * as os from 'os'
import * as core from '@actions/core'
import * as tc from '@actions/tool-cache'

export class Installer {
  protected tempDirectory: string
  protected osPlat: string
  protected osArch: string
  name: string
  binPath: string

  constructor(name: string, binPath: string = './') {
    // Load tempDirectory before it gets wiped by tool-cache
    this.tempDirectory = process.env['RUNNER_TEMPDIRECTORY'] || ''
    this.osPlat = os.platform()
    this.osArch = os.arch()
    this.name = name
    this.binPath = binPath

    this.setupDir()
  }

  setupDir() {
    if (!this.tempDirectory) {
      let baseLocation
      if (process.platform === 'win32') {
        // On windows use the USERPROFILE env variable
        baseLocation = process.env['USERPROFILE'] || 'C:\\'
      } else {
        if (process.platform === 'darwin') {
          baseLocation = '/Users'
        } else {
          baseLocation = '/home'
        }
      }
      this.tempDirectory = path.join(baseLocation, 'actions', 'temp')
    }
  }

  // override it
  getDownloadUrlByVersion(version: string): string {
    throw new Error('implement it yourself')
  }

  async acquire(version: string): Promise<string> {
    const downloadUrl: string = this.getDownloadUrlByVersion(version)
    let downloadPath: string | null = null

    try {
      downloadPath = await tc.downloadTool(downloadUrl)
    } catch (error) {
      core.debug(error)
      throw new Error(`Failed to download version ${version}: ${error}`)
    }

    let extPath: string = this.tempDirectory
    if (!extPath) {
      throw new Error('Temp directory not set')
    }

    extPath = await tc.extractTar(downloadPath)
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
}
