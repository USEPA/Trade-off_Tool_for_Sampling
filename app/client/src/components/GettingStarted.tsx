/** @jsxImportSource @emotion/react */

import React, { Fragment, ReactNode, useEffect, useState } from 'react';
import { css } from '@emotion/react';
import { DialogOverlay, DialogContent } from '@reach/dialog';
// context
import { useLookupFiles } from 'contexts/LookupFiles';
// styles
import { colors, isDecon } from 'styles';

// --- styles (GettingStarted) ---
const linkStyles = css`
  &:focus {
    outline: none;
  }
`;

const overlayStyles = css`
  &[data-reach-dialog-overlay] {
    z-index: 100;
    background-color: ${colors.black(0.75)};
  }
`;

const dialogStyles = css`
  color: ${colors.black()};
  background-color: ${colors.white()};
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
    max-width: 65rem;
  }

  p,
  li {
    font-size: 0.875rem;
    line-height: 1.375;
  }
`;

const headingStyles = css`
  font-size: 117.6471%;
  text-align: center;
`;

// --- components (GettingStarted) ---
type Props = {
  isOpen: boolean;
  children?: ReactNode;
};

function GettingStarted({ isOpen, children }: Props) {
  const { VITE_SERVER_URL } = import.meta.env;
  const baseUrl = VITE_SERVER_URL || window.location.origin;
  const services = useLookupFiles().data.services;

  const app = isDecon() ? 'tods' : 'tots';

  const [dialog, setDialog] = useState<HTMLDivElement | null>(null);
  const setDialogRef = (node: HTMLDivElement | null) => {
    setDialog(node);
  };

  useEffect(() => {
    if (!dialog || !isOpen) return;
    dialog.scrollTo({ top: 0, behavior: 'auto' });
  }, [dialog, isOpen]);

  return (
    <DialogOverlay css={overlayStyles} isOpen={isOpen}>
      <DialogContent
        ref={setDialogRef}
        css={dialogStyles}
        aria-label="Getting Started"
      >
        <h1 css={headingStyles}>Getting Started</h1>

        {app === 'tots' ? (
          <Fragment>
            <p>
              Create sampling designs and estimate the associated resource
              demand through interactive, point-and-click tools to visually
              develop sampling plans. Review an overview of the steps below:
            </p>

            <ul>
              <li>
                <strong>Add Data</strong> – Begin with an existing sampling
                design or add an indoor environment representation to begin.
                Layers to bring to the project include:
                <ul>
                  <li>Samples: Layer containing pre-existing samples</li>
                  <li>
                    Reference Layer: Additional contextual reference layers to
                    include in your analysis (e.g., building footprints,
                    landmarks).
                  </li>
                  <li>
                    Area of Interest: A polygon file that bounds the extent of
                    the project area.
                  </li>
                  <li>
                    Visual Sample Plan (VSP): An externally generated Visual
                    Sample Plan (VSP) layer to analyze and/or use in conjunction
                    with targeted sampling.
                  </li>
                  <li>
                    Contamination Map: When in training mode, adds a layer that
                    includes the area and concentrations of contamination.
                  </li>
                  <li>
                    TOTS Sample Plans: Retrieve a previously saved sampling
                    plan.
                  </li>
                  <li>
                    TOTS Custom Sample Type: Add previously saved custom sample
                    types for use in creating a sampling plan.
                  </li>
                </ul>
              </li>
              <li>
                <strong>Create Plan</strong> – Give a plan a name and
                description, select the layer on which to base the plan, and add
                targeted samples or use the “Add Multiple Random Samples” or
                "Add Statistical Sampling Approach" to draw multiple samples of
                the same type in a specified area of interest. A Resource Tally
                will update as the plan is built. A companion summary table is
                also available detailing the attributes of any samples that are
                added to the plan. Create custom sample types or clone existing
                sample types to support conducting “what-if” scenarios.
              </li>
              <li>
                <strong>Calculate Resources</strong> – Review the default
                resource constraints that are provided to estimate the cost and
                time required to implement the designed plan. Change the default
                parameters to reflect scenario-specific constraints and to
                support conducting “what-if” scenarios. Detailed results can be
                downloaded into a Microsoft Excel spreadsheet.
              </li>
              <li>
                <strong>Configure Output</strong> – Log into the ArcGIS Online
                account to use this feature. Configure what TOTS output is
                published to your ArcGIS Online account. Options include adding
                a web map, incorporating user-defined attributes, and/or
                publishing custom sample types.
              </li>
              <li>
                <strong>Publish Output</strong> – Save and/or share TOTS output
                to your ArcGIS Online account.
              </li>
            </ul>
          </Fragment>
        ) : (
          <Fragment>
            <p>
              Create a decontamination (referred to as “decon” throughout the
              tool) plan through interactive, point-and-click tools to evaluate
              associated resource demands. Review an overview of the steps
              below:
            </p>

            <ul>
              <li>
                <strong>Login</strong> - Login to your ArcGIS Online account (if
                not already logged in).
              </li>
              <li>
                <strong>Add Data (Optional)</strong> – Begin with a published
                TOTS Sampling Plan.
              </li>
              <li>
                <strong>Create Decon Plan</strong> – A single decontamination
                plan can contain one or more decontamination operations.
                Decontamination operations are defined by an AOI Decon Layer
                that represents a unique area of interest (AOI) or “decision
                unit” that is differentiated by the underlying ground surface
                and building infrastructure characteristics.
                <ol>
                  <li>
                    Click Create Decon Plan.
                    <ol>
                      <li>
                        Enter a plan name and description.
                        <br />
                        <i>
                          Note: If the plan name is not accepted you will need
                          to enter a different name to avoid having two plans
                          with the same name. Plan names must be unique.
                        </i>
                      </li>
                    </ol>
                  </li>
                  <li>
                    Click Save.
                    <p style={{ marginTop: '1rem', marginLeft: '-2ch' }}>
                      In this next step, users can define one or more
                      decontamination operations to include in the plan. For
                      each decontamination operation, select or create a new AOI
                      Decon Layer. An empty AOI Decon layer is loaded by
                      default. You will select an appropriate decontamination
                      method for each contamination scenario that is generated
                      for the decontamination layer.
                    </p>
                  </li>

                  <li>
                    Add a Decontamination Operation.
                    <ol>
                      <li>
                        An empty decontamination operation is loaded by default.
                      </li>
                      <li>
                        Click the pencil icon to rename or use the default and
                        click Save.
                      </li>
                    </ol>
                  </li>
                  <li>
                    An empty, default AOI Decon layer is loaded by default if no
                    AOIs are available for selection.
                  </li>
                  <li>
                    Select or create a new AOI Decon Layer.
                    <ol>
                      <li>
                        Update the AOI Decon Layer Name/Desc if you choose (type
                        in the text boxes).
                      </li>
                      <li>
                        Click "Draw Area of Interest" to designate the boundary
                        of your decontamination operation.
                        <ol>
                          <li>
                            Your cursor will turn into sketching mode to draw a
                            boundary on the map.
                          </li>
                          <li>
                            Outline your boundary and double-click to finish.
                          </li>
                        </ol>
                      </li>
                      <li>
                        Click Save and Submit.
                        <br />
                        <i>
                          Note: Please be patient during this step. The tool is
                          performing ground surface imagery analysis and
                          retrieving building infrastructure characteristics.
                          Smaller AOIs will return results more quickly.
                        </i>
                      </li>
                    </ol>
                    <p style={{ marginLeft: '-2ch' }}>
                      The tool will retrieve and analyze building data and
                      ground surface characteristics to inform decontamination
                      strategy decisions.{' '}
                      <strong>
                        Once the data/layer is created, the Select/Edit
                        Decontamination Technology Selections button will
                        appear, and the map will refresh with new imagery
                      </strong>
                      .
                    </p>
                  </li>
                  <li>
                    Click “Select/Edit Decontamination Technology Selections” to
                    assign an appropriate decontamination method to each
                    contamination scenario presented for the AOI Decon Layer.
                    <ol>
                      <li>
                        For each contamination scenario listed, choose a
                        decontamination method from the dropdown menu. Click
                        Save to view the effect of your selection on the
                        resource demand calculations. As you change selections
                        and click Save, you can evaluate differences. Click Save
                        and Continue to return to the main window.
                      </li>
                      <li>
                        Repeat this process to create additional Decon
                        Operations/AOI Decon layers to address the contamination
                        identified from sampling.
                      </li>
                    </ol>
                    Note: A Resource Tally will appear in the left navigation
                    panel once you click the Save button in the Select Decon
                    Technology window for at least one AOI layer; as you work on
                    a specific AOI, an AOI-specific “tally” will display above
                    the table.
                  </li>
                  <li>Click Next to continue.</li>
                </ol>
              </li>
              <li>
                <strong>Calculate Resources</strong>
                <ol>
                  <li>
                    Click View Detailed Results.
                    <ol>
                      <li>
                        An overall summary is presented for the plan along with
                        individual summaries.
                      </li>
                      <li>Click Next to continue.</li>
                    </ol>
                  </li>
                </ol>
              </li>
              <li>
                <strong>Configure Output</strong>
                <ol>
                  <li>Click Next to continue.</li>
                </ol>
              </li>
              <li>
                <strong>Publish Output</strong>
              </li>
            </ul>
          </Fragment>
        )}

        {(app === 'tots' ||
          (app === 'tods' && services.todsUserGuideVisible)) && (
          <p>
            View the{' '}
            <a
              href={`${baseUrl}/api/${app}/userGuide`}
              target="_blank"
              rel="noopener noreferrer"
              css={linkStyles}
            >
              {app.toUpperCase()} User’s Guide (PDF)
            </a>{' '}
            for more detailed instructions
          </p>
        )}

        {children && <Fragment>{children}</Fragment>}
      </DialogContent>
    </DialogOverlay>
  );
}

export default GettingStarted;
