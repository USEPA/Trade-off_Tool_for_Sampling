/** @jsx jsx */

import React from 'react';
import { jsx, css } from '@emotion/core';
import { DialogOverlay, DialogContent } from '@reach/dialog';
import Cookies from 'universal-cookie';
// images
import epaLogo from 'images/epaLogo.png';
// styles
import '@reach/dialog/styles.css';

const OverlayStyles = css`
  &[data-reach-dialog-overlay] {
    z-index: 1000;
    background-color: rgba(0, 0, 0, 0.75);
  }
`;

const DialogStyles = css`
  color: white;
  background-color: #0a71b9;

  &[data-reach-dialog-content] {
    position: relative;
    left: 50%;
    top: 50%;
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
`;

const okButtonContainerStyles = css`
  display: flex;
  justify-content: flex-end;
`;

const okButtonStyles = css`
  margin: 0;
  padding: 0.5882em 1.1765em;
  color: black;
  background-color: #f1f1f1;
  border: 0;
  border-radius: 3px;
  font-family: inherit;
  font-weight: bold;
  line-height: 1;
  text-decoration: none;
  text-align: center;
  vertical-align: baseline;
  white-space: normal;
  font-size: 100%;
  max-width: 100%;
  width: auto;
  overflow: visible;
  cursor: pointer;
`;

function SplashScreen() {
  // Initialize the cookies object
  const [cookies, setCookies] = React.useState<any>(null);
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
    const ssdValue = cookies.get('tots_splashdisabled');

    // Cookies always come back as strings so truthy checks don't work here
    const splashScreenDisabled = ssdValue === 'true' ? true : false;

    // Set states to control the splash screen
    setPreventSplashScreen(splashScreenDisabled);
    setIsOpen(!splashScreenDisabled);
  }, [cookies, hasCheckedCookie]);

  // Set the splash disabled cookie whenever the checkbox changes
  React.useEffect(() => {
    if (!cookies) return;

    cookies.set('tots_splashdisabled', preventSplashScreen, {
      path: '/',
      sameSite: 'strict',
    });
  }, [cookies, preventSplashScreen]);

  return (
    <DialogOverlay css={OverlayStyles} isOpen={isOpen}>
      <DialogContent
        css={DialogStyles}
        aria-label="Welcome to EPA's Trade-off Tool for Sampling (TOTS)"
      >
        <p>
          <img src={epaLogo} alt="" />
        </p>
        <br />
        <h4
          css={css`
            text-align: center;
          `}
        >
          Welcome to EPA's Trade-off Tool for Sampling (TOTS)
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
          TOTS is a GIS-based tool available to support developing sampling
          designs and estimating the associated resource demand. TOTS provides
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
          Users are welcome to <a href="{CONTACT URL}">Contact Us</a> to ask a
          question, provide feedback, or report a problem.
        </p>
        <br />
        <div>
          <input
            id="splash-screen-toggle"
            type="checkbox"
            checked={preventSplashScreen}
            onChange={(ev) => setPreventSplashScreen(!preventSplashScreen)}
          />
          <label htmlFor="splash-screen-toggle">
            Do not show this welcome screen again.
          </label>
        </div>
        <div css={okButtonContainerStyles}>
          <button
            className="btn"
            css={okButtonStyles}
            onClick={(ev) => setIsOpen(false)}
          >
            OK
          </button>
        </div>
      </DialogContent>
    </DialogOverlay>
  );
}

export default SplashScreen;
