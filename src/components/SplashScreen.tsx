/** @jsx jsx */

import React from 'react';
import { jsx, css } from '@emotion/core';
import Cookies from 'universal-cookie';
import { DialogOverlay, DialogContent } from '@reach/dialog';
// contexts
import { NavigationContext } from 'contexts/Navigation';
// styles
import { colors } from 'styles';
// images
import epaLogo from 'images/epaLogo.png';

// --- styles (SplashScreen) ---
const overlayStyles = css`
  &[data-reach-dialog-overlay] {
    z-index: 1000;
    background-color: ${colors.black(0.75)};
  }
`;

const dialogStyles = css`
  color: ${colors.white()};
  background-color: ${colors.epaBlue};

  &[data-reach-dialog-content] {
    position: relative;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    margin: 0;
    padding: 1.5rem;
    width: auto;
    max-width: 35rem;
  }

  p {
    margin-top: 1rem;
    margin-bottom: 0;
    padding-bottom: 0;
    font-size: 0.875rem;
    line-height: 1.375;

    &:first-of-type {
      margin-top: 0;
    }
  }

  a {
    color: #9f9;
    outline: none;

    &:hover,
    &:focus {
      text-decoration: none;
      color: #4c2c92;
    }
  }
`;

const logoStyles = css`
  display: block;
  margin-bottom: 1rem;
`;

const headingStyles = css`
  text-align: center;
`;

const footerStyles = css`
  display: flex;
  justify-content: space-between;
`;

const linkButtonStyles = css`
  display: inline;
  margin: 0;
  padding: 0;
  border: none;
  font-family: inherit;
  font-size: 0.875rem;
  text-decoration: underline;
  color: #9f9;
  background-color: transparent;
  cursor: pointer;
  outline: none;

  &:hover,
  &:focus {
    text-decoration: none;
    color: #4c2c92;
  }
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
  const { setGettingStartedOpen } = React.useContext(NavigationContext);

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
    <DialogOverlay
      css={overlayStyles}
      isOpen={isOpen}
      data-testid="tots-splash-screen"
    >
      <DialogContent
        css={dialogStyles}
        aria-label="Welcome to EPA’s Trade-off Tool for Sampling (TOTS)"
      >
        <img css={logoStyles} src={epaLogo} alt="EPA Logo" />

        <h4 css={headingStyles}>
          Welcome to EPA’s Trade-off Tool for Sampling (TOTS)
        </h4>

        <p>
          A large-scale release of a biological or radiological (BR) agent can
          result in contamination of a wide area and would require significant
          time and resources for recovery. Many unknowns are associated with
          characterization and clearance sampling during response to a wide-area
          BR incident. To better understand the impacts sampling designs can
          have on the resource demand, especially when considering large-scale
          sampling campaigns, EPA’s Homeland Security Research Program (HSRP)
          developed the Trade-Off Tool for Sampling (TOTS).
        </p>

        <p>
          TOTS currently addresses biological contamination sampling and will
          cover other agents in the future. TOTS allows user to create sampling
          designs and estimate the associated resource demand through
          interactive, point-and-click tools to visually develop sampling plans.
          Users can plot sample locations in conjunction with externally
          developed indoor or outdoor imagery that can be imported into the
          tool. Based on the plans designed, TOTS estimates the total time and
          cost necessary for implementation, which includes sampling kit
          preparation, conducting the sampling campaign, and lab analysis. The
          resulting sample plan can be used to consider trade-offs in one’s
          sampling design (i.e., cost-benefit analysis), alternate sampling
          approaches (i.e., traditional vs. innovative sampling methods), and
          sampling coverage.
        </p>

        <p>
          Review{' '}
          <button
            css={linkButtonStyles}
            onClick={() => {
              setGettingStartedOpen(true);
              setIsOpen(false);
            }}
          >
            Getting Started
          </button>{' '}
          for a quick overview of the tools' primary features. Users are welcome
          to{' '}
          <a
            href={
              'https://www.epa.gov/homeland-security-research/forms/contact-us-about-homeland-security-research'
            }
            target="_blank"
            rel="noopener noreferrer"
          >
            Contact Us
          </a>{' '}
          to ask a question, provide feedback, or report a problem.
        </p>

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
      </DialogContent>
    </DialogOverlay>
  );
}

export default SplashScreen;
