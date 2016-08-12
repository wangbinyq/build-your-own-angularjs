module.exports = {
    entry: './index.js',
    output: {
        path: __dirname,
        filename: 'bundle.js'
    },
    module: {
        loaders: [{
            test: /\.js$/,
            exclude: /node_modules/,
            loader: 'babel',
            query: {
                presets: ['es2015', 'react']
            }
        }, {
            test: /\.css/,
            loader: 'style!css?modules&localIdentName=[local]-[hash:base64:5]&-url'
        }]
    },
    devtool: 'source-map'
}
