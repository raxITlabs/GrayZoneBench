'use server'

import { revalidateTag } from 'next/cache'

export async function refreshCache() {
  revalidateTag('metadata')
  revalidateTag('model-data')
}

export async function refreshMetadata() {
  revalidateTag('metadata')
}

export async function refreshModelData() {
  revalidateTag('model-data')
}