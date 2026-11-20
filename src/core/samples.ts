import documentJson from '../../samples/document.json'
import kvJson from '../../samples/key-value.json'
import wcJson from '../../samples/wide-column.json'
import graphJson from '../../samples/graph.json'
import type { Sample } from './dataset'

export const SAMPLES: Sample[] = [documentJson, kvJson, wcJson, graphJson] as unknown as Sample[]
