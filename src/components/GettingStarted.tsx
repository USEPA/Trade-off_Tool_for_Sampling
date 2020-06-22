/** @jsx jsx */

import React from 'react';
import { jsx, css } from '@emotion/core';
import { DialogOverlay, DialogContent } from '@reach/dialog';
// styles
import { colors } from 'styles';

// --- styles (GettingStarted) ---
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
    max-width: 60rem;
  }

  p {
    margin-top: 1rem;
    margin-bottom: 1rem;
    padding-bottom: 0;
    font-size: 1.0625rem;
    line-height: 1.375;

    &:first-of-type {
      margin-top: 0;
    }
  }

  a {
    color: #9f9;
    outline: none;
  }
`;

const headingStyles = css`
  text-align: center;
`;

// --- components (GettingStarted) ---
type Props = {
  isOpen: boolean;
  children?: React.ReactNode;
};

function GettingStarted({ isOpen, children }: Props) {
  return (
    <DialogOverlay
      css={overlayStyles}
      isOpen={isOpen}
      data-testid="tots-getting-started"
    >
      <DialogContent css={dialogStyles} aria-label="Getting Started">
        <h4 css={headingStyles}>Getting Started</h4>

        <p>
          Create sampling designs and estimate the associated resource demand
          through interactive, point-and-click tools to visually develop
          sampling plans. Review an overview of the steps below:
        </p>

        <ul>
          <li>
            <strong>Locate</strong> – Start here to zoom to a location on the
            map to create a sampling design for an outdoor area.
          </li>
          <li>
            <strong>Add Data</strong> – Begin with an existing sampling design
            or add an indoor environment representation to begin. Layers to
            bring to your project include:
            <ul>
              <li>Samples: Layer containing pre-existing samples</li>
              <li>
                Reference Layer: Additional contextual reference layers to
                include in your analysis (e.g., building footprints, landmarks,
                etc.).
              </li>
              <li>
                Area of Interest: A polygon file that bounds the extent of your
                project area.
              </li>
              <li>
                Visual Sample Plan (VSP): Add an externally generated Visual
                Sample Plan (VSP) layer to analyze and/or use in conjunction
                with targeted sampling.
              </li>
              <li>
                Contamination Map: When in training mode, add a layer that
                includes the area and concentrations of contamination.
              </li>
            </ul>
          </li>
          <li>
            <strong>Create Plan</strong> – Identify the layer on which to base
            your plan, give it a name and description and plot targeted samples
            or use the “Add Multiple Rand Samples” to plot multiple samples of
            the same type in a specified area of interest. A Resource Tally will
            update as you continue building your plan.
          </li>
          <li>
            <strong>Calculate Resources</strong> — Default resource constraints
            are provided to estimate the cost and time required to implement the
            designed plan. You can change the default parameters to reflect
            scenario-specific constraints and to support conducting "what-if"
            scenarios. Detailed results can be downloaded into a Microsoft Excel
            spreadsheet.
          </li>
          <li>
            <strong>Publish Plan</strong> – Save and/or share your plan to
            ArcGIS Online as a hosted feature layer. You must be logged into
            your ArcGIS Online account to use this feature.
          </li>
        </ul>

        {children && <React.Fragment>{children}</React.Fragment>}
      </DialogContent>
    </DialogOverlay>
  );
}

export default GettingStarted;
