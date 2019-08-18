# actions-installer

[![NPM version](https://img.shields.io/npm/v/@zcong/actions-installer.svg?style=flat)](https://npmjs.com/package/@zcong/actions-installer) [![NPM downloads](https://img.shields.io/npm/dm/@zcong/actions-installer.svg?style=flat)](https://npmjs.com/package/@zcong/actions-installer) [![CircleCI](https://circleci.com/gh/zcong1993/actions-installer/tree/master.svg?style=shield)](https://circleci.com/gh/zcong1993/actions-installer/tree/master) [![codecov](https://codecov.io/gh/zcong1993/actions-installer/branch/master/graph/badge.svg)](https://codecov.io/gh/zcong1993/actions-installer)

> Easily build a setup actions

## Install

```sh
$ yarn add @zcong/actions-installer
```

## Usage

```ts
import { Installer } from '@zcong/actions-installer'
import * as core from '@actions/core'

class DockerizeInstaller extends Installer {
  constructor() {
    super('dockerize')
  }

  setupDir() {
    if (process.platform === 'win32') {
      core.setFailed('not support windows platform')
    }
    super.setupDir()
  }

  getDownloadUrlByVersion(version: string): string {
    const platform: string = this.osPlat
    const arch: string = this.osArch == 'x64' ? 'amd64' : '386'
    const filename: string = `dockerize-${platform}-${arch}-v${version}.tar.gz`
    return `https://github.com/jwilder/dockerize/releases/download/v${version}/${filename}`
  }
}

const instance = new DockerizeInstaller()

async function run() {
  try {
    const version = core.getInput('dockerize-version')
    if (version) {
      await instance.getTools(version)
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
```

## License

MIT &copy; zcong1993
