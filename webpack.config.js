'use strict';

var path = require('path');
const webpack = require('webpack');
const SplitByPathPlugin = require('webpack-split-by-path');
const TypedocPlugin = require('typedoc-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const plugins = [
    new TypedocPlugin({
        externalPattern: '**/*.spec.ts',
        excludeExternals: true,
    }),
    new webpack.NoErrorsPlugin(),
    new webpack.SourceMapDevToolPlugin({
        filename: null,
        test: /\.ts$/,
    }),
    new SplitByPathPlugin([{
        name: 'vendor',
        path: [path.join(__dirname, 'node_modules/')]
    }]),
    new webpack.optimize.UglifyJsPlugin({
        compress: {
            warnings: true,
        },
    }),
    new HtmlWebpackPlugin(),
];

module.exports = {
    entry: './src/main.ts',

    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
        library: 'rxjs-game',
        libraryTarget: 'umd',
        umdNamedDefine: true,
    },

    devtool: 'source-map',

    resolve: {
        extensions: [
            '',
            '.ts',
            '.js',
            '.json',
        ],
    },

    plugins: plugins,

    module: {
        preLoaders: [
            {
                test: /\.ts$/,
                loader: 'tslint',
                exclude: /node_modules/,
            },
            {
                test: /\.js$/,
                loader: 'source-map-loader',
                exclude: /node_modules/,
            },
        ],
        loaders: [
            {
                test: /\.ts$/,
                loader: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    }
};
