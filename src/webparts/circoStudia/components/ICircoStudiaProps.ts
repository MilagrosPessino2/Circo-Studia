import { WebPartContext } from "@microsoft/sp-webpart-base";

export interface ICircoStudiaProps {
  description: string;
  isDarkTheme: boolean;
  environmentMessage: string;
  hasTeamsContext: boolean;
  userDisplayName: string;
  context: WebPartContext;
}
