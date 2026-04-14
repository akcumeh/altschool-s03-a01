module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testTimeout: 15000,
    forceExit: true,
    collectCoverage: true,
    coverageDirectory: 'coverage',
    collectCoverageFrom: ['src/**/*.ts'],
    globals: {
        'ts-jest': {
            diagnostics: { ignoreCodes: [151002] },
        },
    },
};
