# s3-deployer

A node script to upload files to S3.

All files will be uploaded to a `history/<hash>` folder and then copied to the bucket's root.

## Installation

You can install the package globally using npm.

```
npm i -g s3-deployer
```

## Configuration

Copy the included `config.example.json` to your project as `config.json` and edit the file.

### `accessKeyId` and `secretAccessKey`

Access and secret access keys given by AWS.

### `bucket`

Bucket name.

### `path`

The contents of this path will be uploaded to the S3 bucket. E.g. `dist` or `build`.

### `filters`

Optional. An array of directories to be ignored. E.g. `.git` or `node_modules`.

## Usage

Simply call the script binary from inside your project.

```
s3-deployer
```
By default it will look for a `config.json` file but you can use a different file by passing an argument.

```
s3-deployer my-config.json
```
