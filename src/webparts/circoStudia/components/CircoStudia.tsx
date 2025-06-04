import * as React from 'react'
import type { ICircoStudiaProps } from './ICircoStudiaProps'
import { SPFI } from '@pnp/sp'
import { ICircoStudia } from '../../../interfaces'
import { getSP } from '../../../pnpjsConfig'
import { useState } from 'react'
import styles from './CircoStudia.module.scss'

const CircoStudia = (props: ICircoStudiaProps): JSX.Element => {
    const LOG_SOUCE = 'Circo Studia Webpart'
    const LIST_NAME = 'Oferta_materias_TecWeb'
    const _sp: SPFI = getSP(props.context)

    const [circoStudiaItems, setCircoStudiaItems] = useState<ICircoStudia[]>([])

    const getCircoStudiaItems = async (): Promise<void> => {
        try {
            const items = await _sp.web.lists
                .getByTitle(LIST_NAME)
                .items.select(
                    'Id',
                    'Title',
                    'field_1',
                    'field_2',
                    'field_3',
                    'field_4',
                    'field_5'
                )()
            setCircoStudiaItems(items)
            console.log('console', _sp)
            console.log('Items', items)
        } catch (err) {
            console.error(`${LOG_SOUCE} - Error al obtener ítems:`, err)
        }
    }

    React.useEffect((): void => {
        const fetchData = async (): Promise<void> => {
            await getCircoStudiaItems()
        }

        // eslint-disable-next-line no-void
        void fetchData()
    }, [])

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>
                Oferta de Materias Tecnicatura en desarrollo web
            </h1>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>Código</th>
                        <th>Materia</th>
                        <th>Comisión</th>
                        <th>Turno</th>
                        <th>Días</th>
                        <th>Modalidad</th>
                    </tr>
                </thead>
                <tbody>
                    {circoStudiaItems.map((item) => (
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

export default CircoStudia
