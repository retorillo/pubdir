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

Note that glob pattern must be quoted to prevent bash expansion.

```bash
pubdir -p 6000 "**/*.mp4" --duration 30m
```

- When `-p` or `--port` is not present, random port number is used by default.
- When [glob](https://www.npmjs.com/package/glob) pattern is not
  present, `*` is used by default.
- If want to run server temporaliy , specify `--duration` optionally.
  Use `m` suffix to specify server alive duration by minutes. (`h` is hours,
  `s` is seconds) If time-unit is not present, `m` is used by default.

## License

Distributed under the MIT license

Copyright (C) 2016 Retorillo
