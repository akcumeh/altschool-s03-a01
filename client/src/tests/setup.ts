import '@testing-library/jest-dom';

// jsdom does not implement scrollIntoView; ChatFeed calls it on every message update.
window.HTMLElement.prototype.scrollIntoView = () => {};
