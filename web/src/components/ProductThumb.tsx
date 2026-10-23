import { useEffect, useState } from 'react'
import { resolveCatalogImageUrl, type ProductType } from '../lib/catalog'

const BACKUP_COVERS = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBZFRzlTvpNsuF5fXzIODphTT0dQ9CUfJ1IqXy_O8LrHvGshCAb6wWn0dnRV0UztSWn_uROQNY-x90CZ2pXiuuR7qMttDOWcTk26OAxV1R1JNeuMFD4B2tndV8IXdVEjxGSz3DOb7E2AaLhwvgD2DvD5KQV1N9lXQ0kyxBCxgvJpSJGPen8dtQK2XIYk2-Ef7DIAiCcS3t1EL85Bjxi3Tu-ihR27_rdxLXHbfBiB5erkJHt-NSjPpsT',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAM3wUxxiYFEOwbWRpAFVEV9B6iTifVVsUkOgZw2PkGBBSCNwS11J6Z6foW0bFC2j6ZWxf9jJtbWZ6oehj8ZtJ8Olsfbjt54Lf0k4bz8kGKDLprJ-_SZUzblLPzOp2o7Tr38xm-8__NeHa5A3bzmHZzQOBoVaXqlaL_iOOT912cah4yTYGg0ZjSjrkktedFpIQm0PYhJBSdVcABBpfQ3gwiAKCmzfgm4e7o9931zlXvOtNANdA7WJHN',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCSANzHim44Cn-lPnJs0n3YECYyXziu9q4NxFf_ngcC_IqZ1s2l_hbfeisQSEKs5UK1u5nG97zFfURVr20E71NW7vzyTSMQHPnQSUkzajxu36Qo2GGW5pumqQfladbnYUWPgsNROYVHhOV3mSbDGdLnNHHDJe5tiZDkdDQ-b2JfA9Tcud6IlKuWD42CqC_Nh7KXpJXVGT8cAByhhTUkQzg4FjENCswg1eUfF23jESS-LF-9zBbTwCug',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuC9eANfe6HvChh7-yYxa_1yZ1ElDSqt3z4yvc8VfztGEpwShTv3S1tuqBS_Ywnfek3pL1H8ELJ78OpxVA89GzccskmIdIBKG5hc0C4q-3mYrSIG-39-xfU3Y-JN-NKY_Twumx5YJ9E-fHCLQk31dmDWfMlW7KmPE5gyxZOY5CasrgPekPOlxUhNZ1R-NP1bVTrle01MYjhKkOqPcvqow13PxLj0iVb71FiI9QJ95L7-Us6xOCbPe2aO',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDT13x_B0t-qQ57U7h_K2J7q4s04bC7N-f1bJm58k55-x9L2zN189fS1qU71Q-qP3lP09eE9eD6b5832uD2kH9rF7aM6eP_Q3fR4xL1zM8oP0qR3kS2uD8aK4hL9jH6rE7fM2eQ',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBd1huHDlXXqyqr126NbGf1jVuq8iVOgM3B3ckSkwd7FjChevpLQlpoYzzd31Sfje1cTsiueBLqQS8DXtZw_cRQi-z--XOc-P1wB7nmP-Y1Pj-L6HngyO8vT0bX5zo0fmATYiIhn-kr1gwXscuGR-Lcj3hqb0a4RBxSipz1wLIbI9_CpPSKp3dHeGJxx7_pivYGG6mtdXnGd8fOGJHLQVnIAfhvv7EDrzLlZqI9u4S5GqAuv4uxapr8',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBVn8G6pJd_jTVhtrho3cpej8Tvjd3xpzX3peUcdhx6C4HMn8vrHe5Sjxo-2LqW60Qitksf6l7Ej2Air9gwT7K44SHFYa1Oh-nfwbx9y7jn_2XhDngbpLjWYd9tbjGhYup_K0RL0Du5oqVDa-cq5_DO4n3aHKnDkzVUGnRseTqyiV5CQY4rOztVDRLhxLwkUbQW0utact0v_a5jheqzbt-rtJBGSQMDP65vWUIge0BuGh_yUyYhp08Z',
]

export default function ProductThumb({
  seed,
  productType: _productType = 'accessory',
  imageUrl,
  appearance: _appearance = 'default',
}: {
  seed: number
  productType?: ProductType
  imageUrl?: string
  appearance?: 'default' | 'detail'
}) {
  const resolvedImageUrl = resolveCatalogImageUrl(imageUrl)
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => setImageFailed(false), [resolvedImageUrl])

  const effectiveSrc = resolvedImageUrl && !imageFailed
    ? resolvedImageUrl
    : BACKUP_COVERS[seed % BACKUP_COVERS.length]

  return (
    <img
      src={effectiveSrc}
      alt=""
      className="w-full h-full object-cover"
      loading="lazy"
      onError={() => {
        if (!imageFailed) setImageFailed(true)
      }}
    />
  )
}
