# S3 Deployer

A CLI tool for uploading files to Amazon S3 buckets using Node.js.

All files are uploaded to a `history/<hash>` folder and then copied to the bucket's root.

Optionally, provide a CloudFront distribution ID to trigger a complete cache invalidation.

## Installation

Install the package globally using npm.

```
npm install -g s3-deployer
```

## Configuration

Copy the included `config.example.json` to your project as `config.json` and edit the file.

### `accessKeyId` and `secretAccessKey`

Access and secret access keys given by AWS.

### `bucket`

Bucket name.

### `distributionId`

Optional. A CloudFront distribution ID.

### `path`

The contents of this path will be uploaded to the S3 bucket. E.g. `dist` or `build`.

### `filters`

Optional. An array of directories to be ignored. E.g. `.git` or `node_modules`.

### `keep`

Optional. An array of files to ignore during the pruning process.

## Usage

Simply run the script from a terminal inside your project.

```
deploy
```
By default it will look for a `config.json` file but you can pass a different one by using `--config`.

```
deploy --config my-config.json
```

Pass `--force` to skip the `git status` check.

```
deploy --force
```

When using `--force` keep in mind that the contents of `history/<hash>` might not match the contents of the actual commit.

## License

Copyright 2018 Camilo Rivera

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
