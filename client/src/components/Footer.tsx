import './Footer.css';

export default function Footer() {
    return (
        <footer className="app-footer">
            <div className="app-footer__inner">
                <span className="app-footer__credit">
                    Designed &amp; Built by Angel Umeh (ALT-SOE-025-3527)
                </span>
                <nav className="app-footer__links">
                    <a href="https://angelumeh.dev" target="_blank" rel="noreferrer" aria-label="angelumeh.dev">
                        <img src="/assets/favicon.png" alt="" className="app-footer__logo" />
                    </a>
                    <a href="https://github.com/akcumeh" target="_blank" rel="noreferrer" aria-label="GitHub">
                        <svg className="app-footer__icon" viewBox="0 0 19 19" width="20" height="20" fill="currentColor">
                            <use href="/icons.svg#github-icon" />
                        </svg>
                    </a>
                    <a href="https://x.com/akcumeh" target="_blank" rel="noreferrer" aria-label="X / Twitter">
                        <svg className="app-footer__icon" viewBox="0 0 19 19" width="20" height="20" fill="currentColor">
                            <use href="/icons.svg#x-icon" />
                        </svg>
                    </a>
                </nav>
            </div>
        </footer>
    );
}
