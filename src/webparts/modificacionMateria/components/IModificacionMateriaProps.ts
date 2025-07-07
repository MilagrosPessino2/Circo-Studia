import { WebPartContext } from "@microsoft/sp-webpart-base";

export interface IModificacionMateriaProps {
  description: string;
  isDarkTheme: boolean;
  environmentMessage: string;
  hasTeamsContext: boolean;
  userDisplayName: string;
  context: WebPartContext;
}
