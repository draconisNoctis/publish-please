const chalk = require('chalk');
const elegantStatus = require('elegant-status');
const emoji = require('node-emoji').emoji;
const Promise = require('pinkie-promise');

const validations = [
    require('./vulnerable-dependencies'),
    require('./uncommitted-changes'),
    require('./untracked-files'),
    require('./sensitive-data'),
    require('./branch'),
    require('./git-tag'),
];

function runValidation(validation, param, pkgInfo, errs) {
    const done = elegantStatus(validation.statusText);

    // prettier-ignore
    return validation
        .run(param, pkgInfo)
        .then(() => done(true))
        .catch((err) => {
            Array.isArray(err)
                ? errs.push(...err)
                : errs.push(err);
            done(false);
        });
}

function skipValidation(validation, errs) {
    const done = elegantStatus(validation.statusText);
    return Promise.resolve()
        .then(() => errs.push(validation.whyCannotRun()))
        .then(() => done(false));
}

module.exports = {
    DEFAULT_OPTIONS: validations.reduce((opts, validation) => {
        opts[validation.option] = validation.canRun()
            ? validation.defaultParam
            : false;

        return opts;
    }, {}),

    configurators: validations.reduce((opts, validation) => {
        opts[validation.option] = validation.configurator;
        return opts;
    }, {}),

    validate: function(opts, pkgInfo) {
        const errs = [];
        const validationsToRun = validations.filter(
            (validation) => !!opts[validation.option]
        );

        if (!validationsToRun.length) return Promise.resolve();

        console.log(chalk.yellow('Running validations'));
        console.log(chalk.yellow('-------------------'));
        console.log('');

        return validationsToRun
            .reduce((validationChain, validation) => {
                return validationChain.then(
                    () =>
                        // prettier-ignore
                        validation.canRun()
                            ? runValidation(
                                validation,
                                opts[validation.option],
                                pkgInfo,
                                errs
                            )
                            : skipValidation(validation, errs)
                );
            }, Promise.resolve())
            .then(() => {
                if (errs.length) {
                    const msg = errs.map((err) => '  * ' + err).join('\n');
                    throw new Error(msg);
                }
                console.log(chalk.yellow('-------------------'));
                console.log(emoji['+1'], emoji['+1'], emoji['+1']);
                console.log('');
            });
    },
};
