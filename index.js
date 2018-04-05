#!/usr/bin/env node

const args = require('args');
const fs = require('fs');
const icongen = require('icon-gen');
const jimp = require('jimp');
const path = require('path');
const { promisify } = require('util');

const run = async () => {
    args
        .option(['i', 'input'], 'Input PNG file. Recommended (1024x1024)', './icon.png', p => path.resolve(process.cwd(), p))
        .option(['o', 'output'], 'Folder to output new icons folder', './', p => path.resolve(process.cwd(), p))
        .option(['e', 'ebuild'], 'Use electron-builder directory structure', false)
        .option('verbose', 'Print detailed output', false);

    const flags = args.parse(process.argv);

    if(!await promisify(fs.exists)(flags.input)) {
        throw `${flags.input} does not exist, exiting`;
    }

    if(!await promisify(fs.exists)(flags.output)) {
        await promisify(fs.mkdir)(flags.output);
    }

    const outputBase = flags.ebuild ? flags.output : path.join(flags.output, 'icons');
    const pngOutput = path.join(outputBase, flags.ebuild ? 'icons' : 'png');
    const macOutput = flags.ebuild ? flags.output : path.join(outputBase, 'mac');
    const winOutput = flags.ebuild ? flags.output : path.join(outputBase, 'win');
    const pngSizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024];

    for (const p of [outputBase, pngOutput, macOutput, winOutput]) {
        if(!await promisify(fs.exists)(p)) {
            await promisify(fs.mkdir)(p);
        }
    }

    for (const size of pngSizes) {
        const outputPath = path.join(pngOutput, size + '.png');
        const image = await jimp.read(flags.input);
        const resized = image.resize(size, size, jimp.RESIZE_BICUBIC);
        await new Promise((res, rej) => resized.write(outputPath, err => err ? rej(err) : res()));
        if (flags.verbose) {
            console.log('Wrote ' + outputPath);
        }
    }
    await icongen(pngOutput, winOutput, {
        type: 'png',
        names: { ico: 'icon' },
        modes: [ 'ico' ],
        report: flags.verbose
    });

    await icongen(pngOutput, macOutput, {
        type: 'png',
        names: { icns: 'icon' },
        modes: [ 'icns' ],
        report: flags.verbose
    });

    for (const size of pngSizes) {
        const startName = path.join(pngOutput, size + '.png');
        const endName = path.join(pngOutput, size + 'x' + size + '.png');
        await promisify(fs.rename)(startName, endName);
        if (flags.verbose) {
            console.log('Renamed ' + startName + ' to ' + endName);
        }
    }
}

run().catch(err => console.error(err));
