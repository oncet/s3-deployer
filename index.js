#! /usr/bin/env node

var fs   = require('fs');
var aws  = require('aws-sdk');
var walk = require('walk');
var mime = require('mime');
var proc = require('child_process');
var args = require('minimist')(process.argv.slice(2), {
    string: 'config',
    boolean: 'force',
    default: {
        config: 'config.json',
        force: false
    },
    alias: {
        c: 'config',
        f: 'force'
    }
});

// Get config file
var config = config(args.config);

if(!config) {
    console.log('Config file not found');
    return false;
}

console.log("Config file loaded\n");

var status = proc.execSync('git status').toString().split("\n");

var nothingToCommit = status[1].startsWith('nothing to commit');

if(!nothingToCommit && !args.force) {
    console.log('There are pending changes');
    return false;
}

// Setup AWS
aws.config.accessKeyId     = config.aws.accessKeyId;
aws.config.secretAccessKey = config.aws.secretAccessKey;

var s3 = new aws.S3();

var hash = proc.execSync('git rev-parse --short HEAD').toString().trim();

var files = [];

// Walk the given path
var walker = walk.walk(config.walk.path, {filters: config.walk.filters});

console.log("Starting upload process...\n");

// For each file on the directory...
walker.on('file', function(root, file, next) {

    var filePath = root + '/' + file.name;

    var uploadTo = 'history/' + hash + '/' + filePath.replace(config.walk.path + "/", "");

    var params = {
        ACL: 'private',
        Body: fs.createReadStream(filePath),
        Bucket: config.aws.s3.bucket,
        Key: uploadTo
    };

    var type = mime.getType(file.name);

    if(type) {
        params.ContentType = type;
    }

    console.log('Uploading ' + file.name + ' to ' + uploadTo);

    s3.upload(params, function(err, data) {

        if (err) {
            console.log("Upload failed\n", err.message);

            return false;
        }

        console.log('File successfully uploaded');

        files.push({
            'path': filePath,
            'uploadTo': uploadTo
        });

        next();
    });
});

// After uploading all files.
walker.on('end', function() {

    if(files.length < 1) {
        console.log('Nothing to upload');
        return false;
    }

    console.log('Finished uploading ' + files.length + " file(s)\n");

    s3.listObjects({Bucket: config.aws.s3.bucket}, function(err, data) {

        if(err) {
            console.log(err);

            return false;
        }

        var objects = [];

        data.Contents.forEach(function(content) {
            if(!content.Key.startsWith('history/')) {
                objects.push({Key: content.Key});
            }
        });

        if(objects.length > 0) {

            console.log('Deleting previous deploy...');

            var params = {
                Bucket: config.aws.s3.bucket,
                Delete: { Objects: objects }
            };

            s3.deleteObjects(params, function(err, data) {

                // If deleting failed
                if (err) {
                    console.log(err);

                    return false;
                }

                console.log("Successfully deleted previous deploy\n");
                deploy(files);
            });
        } else {
            deploy(files);
        }
    });
});

function deploy(files)
{
    console.log('Deploying...');

    files.forEach(function(file, index) {

        var copyTo = file.path.replace(config.walk.path + '/', '');

        var params = {
            ACL: 'public-read',
            Bucket: config.aws.s3.bucket,
            CopySource: config.aws.s3.bucket + '/' + file.uploadTo,
            Key: copyTo
        };

        s3.copyObject(params, function(err, data) {

            if (err) {
                console.log('Error while deploying ' + file.path, err.message);

                return false;
            }

            console.log('Successfully deployed ' + file.path + ' to ' + copyTo);

            if(index === files.length) {

                console.log('Finished deploying ' + files.length + " file(s)\n");

                if(config.aws.cloudfront && config.aws.cloudfront.distributionId) {

                    console.log('Invalidating CloudFront cache...');

                    var cloudfront = new aws.CloudFront();

                    var params = {
                        DistributionId: config.aws.cloudfront.distributionId,
                        InvalidationBatch: {
                            CallerReference: Date.now().toString(),
                            Paths: {
                                Quantity: 1,
                                Items: [
                                    '/*'
                                ]
                            }
                        }
                    };

                    cloudfront.createInvalidation(params, function(err, data) {

                        if(err) {
                            console.log('Error when trying to invalidate distribution', err);

                            return false;
                        }

                        console.log(
                            "Distribution invalidation successfully started, check your AWS console\n",
                            'https://console.aws.amazon.com/cloudfront/home?#distribution-settings:'
                            + config.aws.cloudfront.distributionId + "\n"
                        );
                    });
                }
            }
        });
    });
}

function config(file = 'config.json')
{
    if(!fs.existsSync(file)) {
        return false;
    }

    return JSON.parse(fs.readFileSync(file));
}