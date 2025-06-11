import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import { IReadonlyTheme } from '@microsoft/sp-component-base';
import { ICircoStudiaProps } from './components/ICircoStudiaProps';

import App from '../../app'; // ✅ Asegurate que la ruta esté bien

export interface ICircoStudiaWebPartProps {
  description: string;
}

export default class CircoStudiaWebPart extends BaseClientSideWebPart<ICircoStudiaWebPartProps> {
  private _isDarkTheme: boolean = false;
  private _environmentMessage: string = '';

  public render(): void {
    const element: React.ReactElement<ICircoStudiaProps> = React.createElement(App, {
      context: this.context,
      description: this.properties.description,
      isDarkTheme: this._isDarkTheme,
      environmentMessage: this._environmentMessage,
      hasTeamsContext: !!this.context.sdks.microsoftTeams,
      userDisplayName: this.context.pageContext.user.displayName,
    })

    ReactDom.render(element, this.domElement)
  }

  protected onInit(): Promise<void> {
    return this._getEnvironmentMessage().then(message => {
      this._environmentMessage = message;
    });
  }

  private _getEnvironmentMessage(): Promise<string> {
    if (!!this.context.sdks.microsoftTeams) {
      return this.context.sdks.microsoftTeams.teamsJs.app.getContext()
        .then(context => {
          let environmentMessage: string = '';
          switch (context.app.host.name) {
            case 'Office':
              environmentMessage = this.context.isServedFromLocalhost ? 'Local Office' : 'Office';
              break;
            case 'Outlook':
              environmentMessage = this.context.isServedFromLocalhost ? 'Local Outlook' : 'Outlook';
              break;
            case 'Teams':
              environmentMessage = this.context.isServedFromLocalhost ? 'Local Teams' : 'Teams';
              break;
            default:
              environmentMessage = 'Unknown';
          }

          return environmentMessage;
        });
    }

    return Promise.resolve(
      this.context.isServedFromLocalhost ? 'Local SharePoint' : 'SharePoint'
    );
  }

  protected onThemeChanged(currentTheme: IReadonlyTheme | undefined): void {
    if (!currentTheme) return;
    this._isDarkTheme = !!currentTheme.isInverted;
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }
}
