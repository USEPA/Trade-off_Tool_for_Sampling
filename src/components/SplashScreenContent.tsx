/** @jsx jsx */

import React from 'react';
import { jsx, css } from '@emotion/core';
import { DialogOverlay, DialogContent } from '@reach/dialog';
// styles
import { colors } from 'styles';
// images
import epaLogo from 'images/epaLogo.png';

// --- styles (SplashScreenContent) ---
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
`;

const logoStyles = css`
  display: block;
  margin-bottom: 1rem;
`;

const headingStyles = css`
  text-align: center;
`;

// --- components (SplashScreenContent) ---
type Props = {
  isOpen: boolean;
  children?: React.ReactNode;
};

function SplashScreenContent({ isOpen, children }: Props) {
  return (
    <DialogOverlay css={overlayStyles} isOpen={isOpen}>
      <DialogContent
        css={dialogStyles}
        aria-label="Welcome to EPA’s Trade-off Tool for Sampling (TOTS)"
      >
        <img css={logoStyles} src={epaLogo} alt="" />

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
          Users are welcome to{' '}
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

        {children && (
          <React.Fragment>
            <br />
            {children}
          </React.Fragment>
        )}
      </DialogContent>
    </DialogOverlay>
  );
}

export default SplashScreenContent;
