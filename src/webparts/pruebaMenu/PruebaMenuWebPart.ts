import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import PruebaMenu from './components/PruebaMenu';
import { IPruebaMenuProps } from './components/IPruebaMenuProps';

export default class PruebaMenuWebPart extends BaseClientSideWebPart<IPruebaMenuProps> {
  public render(): void {
    const element: React.ReactElement<IPruebaMenuProps> = React.createElement(PruebaMenu, {
      context: this.context
    });
    ReactDom.render(element, this.domElement);
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }
}
