module.exports = process.env.CI ? describe.skip.bind(describe) : describe;
