var fs   = require('fs');
var aws  = require('aws-sdk');
var walk = require('walk');
var mime = require('mime');

var config = config(process.argv[2]);

if(!config) {
    console.log('Config file not found');
    return false;
}

console.log('Config file loaded');

// Setup AWS
aws.config.accessKeyId     = config.aws.accessKeyId;
aws.config.secretAccessKey = config.aws.secretAccessKey;

var s3 = new aws.S3();

var date = Date.now();

var files = [];

// Walk the given path
var walker = walk.walk(config.walk.path, {filters: config.walk.filters});

// For each file on the directory...
walker.on('file', step);

// After uploading all files.
walker.on('end', end);

function step(root, file, next) {

    var filePath = root + '/' + file.name;

    var fileContent = fs.createReadStream(filePath);

    var uploadTo = 'history/' + date + '/' + filePath.replace(config.walk.path + "/", "");

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
        }

        else {
            console.log('File successfully uploaded');

            files.push({
                'path': filePath,
                'uploadTo': uploadTo
            });

            next();
        }
    });
}

function end() {

    console.log('Finished uploading files');

    s3.listObjects({Bucket: config.aws.s3.bucket}, function(err, data) {

        if(err) {
            console.log(err);
        }

        else {
            var objects = [];

            data.Contents.forEach(function(content) {
                if(!content.Key.startsWith('history/')) {
                    objects.push({Key: content.Key});
                }
            });

            if(objects.length > 0) {

                console.log('Deleting previous deploy');

                var params = {
                    Bucket: config.aws.s3.bucket,
                    Delete: { Objects: objects }
                };

                s3.deleteObjects(params, function(err, data) {

                    // If deleting failed
                    if (err) {
                        console.log(err);
                    }

                    else {
                        deploy(files);
                    }
                });
            } else {
                deploy(files);
            }
        }
    });
}

function deploy(files) {

	console.log('Deploying...');

	files.forEach(function(file) {

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
            }

            else {
                console.log('Successfully deployed ' + file.path + ' to ' + copyTo);
            }
        });
    });
}

function config(configFile) {

    if(!configFile) {
        configFile = 'config.json';
    }

    if(!fs.existsSync(configFile)) {
        return false;
    }

    return JSON.parse(fs.readFileSync('config.json'));
}