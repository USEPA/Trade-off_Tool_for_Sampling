/** @jsxImportSource @emotion/react */

import React, { useContext, useEffect, useState } from 'react';
import { css } from '@emotion/react';
import Cookies from 'universal-cookie';
import { DialogOverlay, DialogContent } from '@reach/dialog';
// contexts
import { NavigationContext } from 'contexts/Navigation';
// styles
import { colors, isDecon, linkButtonStyles } from 'styles';
// images
import epaLogo from 'images/epaLogo.png';

const app = isDecon() ? 'tods' : 'tots';
const key = isDecon() ? 'tods_splash_disabled' : 'tots_splash_disabled';

// --- styles (SplashScreen) ---
const overlayStyles = css`
  &[data-reach-dialog-overlay] {
    z-index: 100;
    background-color: ${colors.black(0.75)};
  }
`;

const dialogStyles = css`
  color: ${colors.white()};
  background-color: ${colors.epaBlue};
  max-height: 80vh;
  overflow: auto;

  &[data-reach-dialog-content] {
    position: relative;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    margin: 0;
    padding: 1.5rem;
    width: auto;
    max-width: 60rem;
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

  li {
    font-size: 0.875rem;
  }

  a {
    color: #fffe99;
    outline: none;
  }
`;

const logoStyles = css`
  display: block;
  margin-bottom: 1rem;
`;

const headingStyles = css`
  color: white;
  margin: 0;
  padding: 0 0 0.5em;
  font-size: 100%;
  font-weight: bold;
  line-height: 1.3;
  text-align: center;
`;

const footerStyles = css`
  display: flex;
  justify-content: space-between;

  input {
    margin-right: 0.5rem;
  }
`;

const modLinkButtonStyles = css`
  ${linkButtonStyles}

  margin: 0;
  font-family: inherit;
  font-size: 0.875rem;
  color: #fffe99;
  outline: none;

  &:hover,
  &:focus {
    text-decoration: underline;
    color: #fffe99;
  }
`;

const subHeadingStyles = css`
  color: white;
  margin: 0;
  margin-top: 1em;
  padding: 0 0 0.5em;
  font-size: 90%;
  font-weight: bold;
  line-height: 1.3;
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
  const { setGettingStartedOpen } = useContext(NavigationContext);

  // Initialize the cookies object
  const [cookies, setCookies] = useState<Cookies | null>(null);
  useEffect(() => {
    setCookies(new Cookies());
  }, []);

  // Read the splash disabled cookie
  const [hasCheckedCookie, setHasCheckedCookie] = useState(false);
  const [preventSplashScreen, setPreventSplashScreen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => {
    // only check the cookie on load
    if (!cookies || hasCheckedCookie) return;
    setHasCheckedCookie(true);

    // Read the splash disabled cookie.
    // Note: Pre-pendeded 'tots_' to quickly distinguish between tots and esri cookies
    const splashScreenDisabled = cookies.get(key) ?? false;

    // Set states to control the splash screen
    setPreventSplashScreen(splashScreenDisabled);
    setIsOpen(!splashScreenDisabled);
  }, [cookies, hasCheckedCookie]);

  // Set the splash disabled cookie whenever the checkbox changes
  useEffect(() => {
    if (!cookies) return;

    cookies.set(key, preventSplashScreen, {
      path: '/',
      sameSite: 'strict',
    });
  }, [cookies, preventSplashScreen]);

  const [dialog, setDialog] = useState<HTMLDivElement | null>(null);
  const setDialogRef = (node: HTMLDivElement | null) => {
    setDialog(node);
  };

  useEffect(() => {
    if (!dialog || !isOpen) return;
    dialog.scrollTo({ top: 0, behavior: 'auto' });
  }, [dialog, isOpen]);

  return (
    <DialogOverlay
      css={overlayStyles}
      isOpen={isOpen}
      data-testid="tots-splash-screen"
    >
      {app === 'tods' ? (
        <DialogContent
          ref={setDialogRef}
          css={dialogStyles}
          aria-label="Welcome to EPA’s Trade-off Tool for Decontamination Strategies (TODS) "
        >
          <img css={logoStyles} src={epaLogo} alt="EPA Logo" />

          <h2 css={headingStyles}>
            Welcome to EPA’s Trade-off Tool for Decontamination Strategies
            (TODS)
          </h2>

          <p>
            To better understand the impacts decontamination strategies can have
            on waste generation rates and resource demands, especially when
            considering a large-scale event, EPA has developed the Trade-Off
            Tool for Decontamination (TODS). TODS allows users to create
            decontamination plans and estimate the associated waste generation
            and resource demands based on selections of surface and/or
            volumetric decontamination strategies for various contamination
            scenarios. TODS provides ground surfaces and building infrastructure
            characteristics for an area of interest to inform strategies. Users
            can consider decontamination strategies based on where contamination
            may exist or based on the type of primary building material. Users
            can create one or more decontamination operations that are specific
            to an area of interest to tailor decontamination strategies. Based
            on the plan designed, TODS estimates the total time and cost
            necessary for implementation and the result waste that is generated.
          </p>

          <p>
            Review{' '}
            <button
              css={modLinkButtonStyles}
              onClick={() => {
                setGettingStartedOpen(true);
                setIsOpen(false);
              }}
            >
              Getting Started
            </button>{' '}
            for a quick overview of the tools' primary features. Users are
            welcome to{' '}
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
                onChange={(_ev) => setPreventSplashScreen(!preventSplashScreen)}
              />
              <label htmlFor="splash-screen-toggle">
                Do not show this welcome screen again.
              </label>
            </span>

            <button
              className="btn"
              css={buttonStyles}
              onClick={(_ev) => setIsOpen(false)}
            >
              OK
            </button>
          </p>
        </DialogContent>
      ) : (
        <DialogContent
          ref={setDialogRef}
          css={dialogStyles}
          aria-label="Welcome to EPA’s Trade-off Tool for Sampling (TOTS)"
        >
          <img css={logoStyles} src={epaLogo} alt="EPA Logo" />

          <h2 css={headingStyles}>
            Welcome to EPA’s Trade-off Tool for Sampling (TOTS)
          </h2>

          <p>
            A large-scale release of a biological or radiological (BR) agent can
            result in contamination of a wide area and would require significant
            time and resources for recovery. Many unknowns are associated with
            characterization and clearance sampling during response to a
            wide-area BR incident. To better understand the impacts sampling
            designs can have on the resource demand, especially when considering
            large-scale sampling campaigns, EPA’s Homeland Security Research
            Program (HSRP) developed the Trade-Off Tool for Sampling (TOTS).
          </p>

          <p>
            TOTS currently addresses biological contamination sampling and will
            cover other agents in the future. TOTS allows users to create
            sampling designs and estimate the associated resource demand through
            interactive, point-and-click tools to visually develop sampling
            plans. Users can plot sample locations in conjunction with
            externally developed indoor or outdoor imagery that can be imported
            into the tool. Based on the plans designed, TOTS estimates the total
            time and cost necessary for implementation, which includes sampling
            kit preparation, conducting the sampling campaign, and lab analysis.
            The resulting sample plan can be used to consider trade-offs in
            one’s sampling design (i.e., cost-benefit analysis), alternate
            sampling approaches (i.e., traditional vs. innovative sampling
            methods), and sampling coverage.
          </p>

          <h3 css={subHeadingStyles}>What's new as of December 2025?</h3>
          <ul>
            <li>
              Added "Additional Tools" tab for characterizing area of interest,
              identifying staging areas and creating custom sample types.
            </li>
            <li>
              Added ability to pull in TODS decon plans into TOTS for iterative
              approach.
            </li>
            <li>
              Added ability to add samples via a statistical sampling approach.
            </li>
            <li>Added a tooltip for training mode selection.</li>
            <li>Updated app to pull sample type configuration from RADAR.</li>
            <li>Updated basemaps for published output.</li>
            <li>Updated publish logic to include calculation results.</li>
            <li>
              Updated sample type selection so they are categorized as
              established and innovative.
            </li>
            <li>
              Removed locate tab and instead added a locate widget to the map.
            </li>
            <li>
              Fixed bug with generic error message returned for trying to
              publish a custom sample type without providing a name.
            </li>
            <li>
              Fixed bug where View Contamination Hits was double counting
              contamination hits when contamination plumes overlap.
            </li>
          </ul>

          <p>
            Review{' '}
            <button
              css={modLinkButtonStyles}
              onClick={() => {
                setGettingStartedOpen(true);
                setIsOpen(false);
              }}
            >
              Getting Started
            </button>{' '}
            for a quick overview of the tools' primary features. Users are
            welcome to{' '}
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
                onChange={(_ev) => setPreventSplashScreen(!preventSplashScreen)}
              />
              <label htmlFor="splash-screen-toggle">
                Do not show this welcome screen again.
              </label>
            </span>

            <button
              className="btn"
              css={buttonStyles}
              onClick={(_ev) => setIsOpen(false)}
            >
              OK
            </button>
          </p>
        </DialogContent>
      )}
    </DialogOverlay>
  );
}

export default SplashScreen;
