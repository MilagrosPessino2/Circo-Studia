import { WebPartContext } from "@microsoft/sp-webpart-base";

export interface ICircoStudia{
    Id: number;
    Title: string;
    field_1: string;
    field_2: string;
    field_3: string;
    field_4: string;
    field_5: string;
    context: WebPartContext;
}
export interface ICarreraItem {
    Id: number
    nombre: string
}