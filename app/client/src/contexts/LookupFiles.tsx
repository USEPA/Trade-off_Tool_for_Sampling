// @flow

import React, { createContext, ReactNode, useContext, useState } from 'react';
// types
import { LookupFile } from 'types/Misc';
// utilities
import { lookupFetch } from 'utils/fetchUtils';
// config
import { SampleSelectType } from 'config/sampleAttributes';

// Common function for setting the context/state of lookup files.
function getLookupFile(filename: string, setVariable: Function) {
  // fetch the lookup file
  lookupFetch(filename)
    .then((data) => {
      setVariable({ status: 'success', data });
    })
    .catch((err) => {
      console.error(err);
      setVariable({ status: 'failure', data: err });

      window.logErrorToGa(err);
    });
}

type LookupFiles = {
  layerProps: LookupFile;
  setLayerProps: Function;
  notifications: LookupFile;
  setNotifications: Function;
  sampleTypes: any;
  setSampleTypes: Function;
  services: LookupFile;
  setServices: Function;
};

const LookupFilesContext = createContext<LookupFiles>({
  layerProps: { status: 'fetching', data: null },
  setLayerProps: () => {},
  notifications: { status: 'fetching', data: null },
  setNotifications: () => {},
  sampleTypes: { status: 'fetching', data: null },
  setSampleTypes: () => {},
  services: { status: 'fetching', data: null },
  setServices: () => {},
});

type Props = {
  children: ReactNode;
};

function LookupFilesProvider({ children }: Props) {
  const [layerProps, setLayerProps] = React.useState<LookupFile>({
    status: 'fetching',
    data: [],
  });
  const [notifications, setNotifications] = React.useState<LookupFile>({
    status: 'fetching',
    data: [],
  });
  const [sampleTypes, setSampleTypes] = useState<LookupFile>({
    status: 'fetching',
    data: {},
  });
  const [services, setServices] = useState<LookupFile>({
    status: 'fetching',
    data: {},
  });

  return (
    <LookupFilesContext.Provider
      value={{
        layerProps,
        setLayerProps,
        notifications,
        setNotifications,
        sampleTypes,
        setSampleTypes,
        services,
        setServices,
      }}
    >
      {children}
    </LookupFilesContext.Provider>
  );
}

// Custom hook for the layerProps.json file.
let layerPropsInitialized = false; // global var for ensuring fetch only happens once
function useLayerProps() {
  const { layerProps, setLayerProps } = React.useContext(LookupFilesContext);

  // fetch the lookup file if necessary
  if (!layerPropsInitialized) {
    layerPropsInitialized = true;
    getLookupFile('config/layerProps.json', setLayerProps);
  }

  return layerProps;
}

// Custom hook for the messages.json file.
let notificationsInitialized = false; // global var for ensuring fetch only happens once
function useNotificationsContext() {
  const { notifications, setNotifications } =
    React.useContext(LookupFilesContext);

  // fetch the lookup file if necessary
  if (!notificationsInitialized) {
    notificationsInitialized = true;
    getLookupFile('notifications/messages.json', setNotifications);
  }

  return notifications;
}

// Custom hook for the services.json file.
let servicesInitialized = false; // global var for ensuring fetch only happens once
function useServicesContext() {
  const { services, setServices } = useContext(LookupFilesContext);

  // fetch the lookup file if necessary
  if (!servicesInitialized) {
    servicesInitialized = true;

    // get origin for mapping proxy calls
    const loc = window.location;
    const origin =
      loc.hostname === 'localhost'
        ? `${loc.protocol}//${loc.hostname}:9091`
        : loc.origin;

    // fetch the lookup file
    lookupFetch('config/services.json')
      .then((data: any) => {
        const googleAnalyticsMapping: any[] = [];
        data.googleAnalyticsMapping.forEach((item: any) => {
          // get base url
          let urlLookup = origin;
          if (item.urlLookup !== 'origin') {
            urlLookup = data;
            const pathParts = item.urlLookup.split('.');
            pathParts.forEach((part: any) => {
              urlLookup = urlLookup[part];
            });
          }

          let wildcardUrl = item.wildcardUrl;
          wildcardUrl = wildcardUrl.replace(/\{proxyUrl\}/g, data.proxyUrl);
          wildcardUrl = wildcardUrl.replace(/\{urlLookup\}/g, urlLookup);

          googleAnalyticsMapping.push({
            wildcardUrl,
            name: item.name,
          });
        });

        window.googleAnalyticsMapping = googleAnalyticsMapping;

        setServices({ status: 'success', data });
      })
      .catch((err) => {
        console.error(err);
        setServices({ status: 'failure', data: err });

        window.logErrorToGa(err);
      });
  }

  return services;
}

// Custom hook for the documentOrder.json lookup file.
let sampleTyepsInitialized = false; // global var for ensuring fetch only happens once
function useSampleTypesContext() {
  const { sampleTypes, setSampleTypes } = useContext(LookupFilesContext);

  // fetch the lookup file if necessary
  if (!sampleTyepsInitialized) {
    sampleTyepsInitialized = true;
    getLookupFile('sampleTypes/sampleTypes.json', (newValue: LookupFile) => {
      if (newValue.status !== 'success') {
        setSampleTypes(newValue);
        return;
      }

      const sampleSelectOptions: SampleSelectType[] = [];
      const sampleAttributes = newValue.data.sampleAttributes;
      Object.keys(sampleAttributes).forEach((key: any) => {
        const value = sampleAttributes[key].TYPEUUID;
        const label = sampleAttributes[key].TYPE;
        sampleSelectOptions.push({ value, label, isPredefined: true });
      });
      newValue.data['sampleSelectOptions'] = sampleSelectOptions;
      setSampleTypes(newValue);
    });
  }

  return sampleTypes;
}

export {
  LookupFilesContext,
  LookupFilesProvider,
  useLayerProps,
  useNotificationsContext,
  useSampleTypesContext,
  useServicesContext,
};
