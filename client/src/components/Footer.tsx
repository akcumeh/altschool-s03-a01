import './Footer.css';

export default function Footer() {
    return (
        <footer className="app-footer">
            <div className="app-footer__inner">
                <a href="https://angelumeh.dev" target="_blank" rel="noreferrer" className="app-footer__logo-link">
                    <img src="/assets/logo.png" alt="Angel" className="app-footer__logo" />
                </a>
                <span className="app-footer__id">ALT/SOE/025/3527</span>
                <nav className="app-footer__links">
                    <a href="https://github.com/akcumeh" target="_blank" rel="noreferrer" aria-label="GitHub">
                        <svg className="app-footer__icon" viewBox="0 0 19 19" width="18" height="18" fill="currentColor">
                            <use href="/icons.svg#github-icon" />
                        </svg>
                        GitHub
                    </a>
                    <a href="https://x.com/akcumeh" target="_blank" rel="noreferrer" aria-label="X / Twitter">
                        <svg className="app-footer__icon" viewBox="0 0 19 19" width="18" height="18" fill="currentColor">
                            <use href="/icons.svg#x-icon" />
                        </svg>
                        Twitter
                    </a>
                </nav>
            </div>
        </footer>
    );
}
