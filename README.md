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

## Usage

Simply run the script from a terminal inside your project.

```
s3-deployer
```
By default it will look for a `config.json` file but you can pass a different one by using `--config`.

```
s3-deployer --config my-config.json
```

Pass `--force` to skip the `git status` check.

```
s3-deployer --force
```

When using `--force` keep in mind that the contents of `history/<hash>` might not match the contents of the actual commit.
