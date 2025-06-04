import * as React from 'react'
import styles from './OfertaMateriasIngInf.module.scss'
import { SPFI } from '@pnp/sp'
import { IOfertaMateriasIngInf } from '../../../interfaces'
import { getSP } from '../../../pnpjsConfig'
import { useState, useEffect } from 'react'
import type { IOfertaMateriasIngInfProps } from './IOfertaMateriasIngInfProps'

const OfertaMateriasIngInf = (
    props: IOfertaMateriasIngInfProps
): JSX.Element => {
    const LIST_NAME = 'Oferta_materias_IngInf'
    console.log('Contexto recibido:', props.context)

    const _sp: SPFI = getSP(props.context)

    const [items, setItems] = useState<IOfertaMateriasIngInf[]>([])

    const fetchItems = async (): Promise<void> => {
        try {
            console.log('Conectando a la lista:', LIST_NAME)

            const listItems = await _sp.web.lists
                .getByTitle(LIST_NAME)
                .items.select(
                    'Id',
                    'Title', // CodMateria
                    'field_1', // Descripción
                    'field_2', // Comisión
                    'field_3', // Turno
                    'field_4', // Días
                    'field_5' // Modalidad
                )()
            setItems(listItems)

            console.log('Items obtenidos:', listItems)
            console.log('Primer item:', listItems[0])
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error('Error al obtener ítems:', error)
            alert(
                'Error al obtener ítems: ' +
                    (error?.message || JSON.stringify(error))
            )
        }
    }

    useEffect(() => {
        // eslint-disable-next-line no-void
        void fetchItems()
    }, [])

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>
                Oferta de Materias Ingeniería en Informática
            </h1>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>Código</th>
                        <th>Descripción</th>
                        <th>Comisión</th>
                        <th>Turno</th>
                        <th>Días</th>
                        <th>Modalidad</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item) => (
                        <tr key={item.Id}>
                            <td>{item.Title}</td>
                            <td>{item.field_1}</td>
                            <td>{item.field_2}</td>
                            <td>{item.field_3}</td>
                            <td>{item.field_4}</td>
                            <td>{item.field_5}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

export default OfertaMateriasIngInf
