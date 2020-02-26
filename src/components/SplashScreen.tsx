/** @jsx jsx */

import React from 'react';
import { jsx, css } from '@emotion/core';
import Cookies from 'universal-cookie';
// components
import SplashScreenContent from 'components/SplashScreenContent';
// styles
import { colors } from 'styles';

// --- styles (SplashScreen) ---
const footerStyles = css`
  display: flex;
  justify-content: space-between;
`;

const buttonStyles = css`
  margin: 0;
  padding: 0.625rem 1.25rem;
  border: 0;
  border-radius: 3px;
  font-family: inherit;
  font-weight: bold;
  font-size: 0.875rem;
  line-height: 1;
  color: ${colors.black()};
  background-color: ${colors.white(0.875)};
  cursor: pointer;
`;

// --- components (SplashScreen) ---
function SplashScreen() {
  // Initialize the cookies object
  const [cookies, setCookies] = React.useState<Cookies | null>(null);
  React.useEffect(() => {
    setCookies(new Cookies());
  }, []);

  // Read the splash disabled cookie
  const [hasCheckedCookie, setHasCheckedCookie] = React.useState(false);
  const [preventSplashScreen, setPreventSplashScreen] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(true);
  React.useEffect(() => {
    // only check the cookie on load
    if (!cookies || hasCheckedCookie) return;
    setHasCheckedCookie(true);

    // Read the splash disabled cookie.
    // Note: Pre-pendeded 'tots_' to quickly distinguish between tots and esri cookies
    const ssdValue = cookies.get('tots_splash_disabled');

    // Cookies always come back as strings so truthy checks don't work here
    const splashScreenDisabled = ssdValue === 'true' ? true : false;

    // Set states to control the splash screen
    setPreventSplashScreen(splashScreenDisabled);
    setIsOpen(!splashScreenDisabled);
  }, [cookies, hasCheckedCookie]);

  // Set the splash disabled cookie whenever the checkbox changes
  React.useEffect(() => {
    if (!cookies) return;

    cookies.set('tots_splash_disabled', preventSplashScreen, {
      path: '/',
      sameSite: 'strict',
    });
  }, [cookies, preventSplashScreen]);

  return (
    <SplashScreenContent isOpen={isOpen}>
      <p css={footerStyles}>
        <span>
          <input
            id="splash-screen-toggle"
            type="checkbox"
            checked={preventSplashScreen}
            onChange={(ev) => setPreventSplashScreen(!preventSplashScreen)}
          />
          <label htmlFor="splash-screen-toggle">
            Do not show this welcome screen again.
          </label>
        </span>

        <button
          className="btn"
          css={buttonStyles}
          onClick={(ev) => setIsOpen(false)}
        >
          OK
        </button>
      </p>
    </SplashScreenContent>
  );
}

export default SplashScreen;
