var fs   = require('fs');

var exports = module.exports = {};

exports.deploy = function(files, config, s3, aws)
{
    console.log('Deploying...');

    var counter = 1;

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

                return false;
            }

            console.log('Deployed ' + file.path + ' to ' + copyTo);

            if(counter === files.length) {

                console.log(
                    'Finished deploying ' + files.length + " file(s)\n\n" +
                    "View your bucket:\n" +
                    'https://s3.console.aws.amazon.com/s3/buckets/' + config.aws.s3.bucket + "\n"
                );

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
                            "Distribution invalidation started, check your AWS console:\n" +
                            "https://console.aws.amazon.com/cloudfront/home?#distribution-settings:" +
                            config.aws.cloudfront.distributionId + "\n"
                        );
                    });
                }
            }

            counter++;
        });
    });
}

exports.config = function(file = 'config.json')
{
    if(!fs.existsSync(file)) {
        return false;
    }

    return JSON.parse(fs.readFileSync(file));
}

