import * as React from 'react'
import * as ReactDom from 'react-dom'
import { Version } from '@microsoft/sp-core-library'
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base'
import App from '../../../app' // Asegurate que esta ruta sea correcta según tu estructura

export interface ICircoStudiaWebPartProps {}

export default class CircoStudiaWebPart extends BaseClientSideWebPart<ICircoStudiaWebPartProps> {
    public render(): void {
        const element: React.ReactElement = React.createElement(App)
        ReactDom.render(element, this.domElement)
    }

    protected onDispose(): void {
        ReactDom.unmountComponentAtNode(this.domElement) 
    }

    protected get dataVersion(): Version {
        return Version.parse('1.0')
    }
}
