import { WebPartContext } from '@microsoft/sp-webpart-base'

export interface IEstudiantesProps {
  context: WebPartContext
  onEstudianteAgregado?: () => void
}