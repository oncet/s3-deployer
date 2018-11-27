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

var helpers = require('./helpers.js');

// Get config file
var config = helpers.config(args.config);

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

console.log("Starting upload to " + config.aws.s3.bucket + "/" + hash + "\n");

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

    console.log('Uploading ' + filePath);

    s3.upload(params, function(err, data) {

        if (err) {
            console.log("Upload failed\n", err.message);

            return false;
        }

        console.log("File uploaded!\n");

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

            if(
                !content.Key.startsWith('history/') &&
                !helpers.ignored(content.Key, config.keep)
            ) {
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

                console.log("Finished deleting previous deploy\n");
                helpers.deploy(files, config, s3, aws);
            });
        } else {
            helpers.deploy(files, config, s3, aws);
        }
    });
});