# pubdir

[![NPM](https://img.shields.io/npm/v/pubdir.svg)](https://www.npmjs.com/package/pubdir)
[![MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)

A minimal HTTP file server

## Installation

```bash
npm install -g pubdir
```

## Example

Expose all `*.mp4` files recursively at port 6000.

```bash
pubdir -p 60000 **/*.mp4
```

- When `-p` or `--port` is not present, random port number is used by default.
- When [glob](https://www.npmjs.com/package/glob) pattern is not
  present, `*` is used by default.

## License

Distributed under the MIT license

Copyright (C) 2016 Retorillo
