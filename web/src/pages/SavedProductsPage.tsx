import { Link, useSearchParams } from 'react-router-dom'
import ContinueShoppingButton from '../components/ContinueShoppingButton'
import ProductThumb from '../components/ProductThumb'
import { Button, Card, Chip, EmptyState, Page, PageHeader, formatPrice } from '../components/ui'
import { useFavorites, useRecentlyViewed, type SavedProduct } from '../lib/savedProducts'

/** /yeu-thich — favourites, and /yeu-thich?tab=da-xem — recently viewed products. */
export default function SavedProductsPage() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'da-xem' ? 'recent' : 'favorites'
  const favorites = useFavorites()
  const recent = useRecentlyViewed()
  const items = tab === 'favorites' ? favorites.items : recent.items

  return (
    <Page>
      <PageHeader
        breadcrumb={[{ label: 'Trang chủ', to: '/' }, { label: tab === 'favorites' ? 'Yêu thích' : 'Đã xem gần đây' }]}
        title={tab === 'favorites' ? 'Sản phẩm yêu thích' : 'Sản phẩm đã xem gần đây'}
        actions={<ContinueShoppingButton variant="outline" size="sm" />}
      />

      <div className="flex flex-wrap items-center gap-space-xs" role="group" aria-label="Chọn danh sách">
        <Chip active={tab === 'favorites'} onClick={() => setParams({}, { replace: true })}>
          Yêu thích ({favorites.items.length})
        </Chip>
        <Chip active={tab === 'recent'} onClick={() => setParams({ tab: 'da-xem' }, { replace: true })}>
          Đã xem gần đây ({recent.items.length})
        </Chip>
        {tab === 'recent' && recent.items.length > 0 && (
          <Button variant="ghost" size="sm" icon="delete_sweep" className="ml-auto" onClick={recent.clear}>Xoá lịch sử xem</Button>
        )}
      </div>

      {items.length === 0 ? (
        <Card>
          <EmptyState
            icon={tab === 'favorites' ? 'favorite' : 'history'}
            title={tab === 'favorites' ? 'Chưa có sản phẩm yêu thích' : 'Bạn chưa xem sản phẩm nào'}
            description={tab === 'favorites'
              ? 'Bấm biểu tượng trái tim trên sản phẩm để lưu lại xem sau.'
              : 'Các sản phẩm bạn mở sẽ xuất hiện tại đây.'}
            action={<ContinueShoppingButton />}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-space-md">
          {items.map((p, i) => (
            <SavedCard key={p.id} product={p} index={i}
              onRemove={() => (tab === 'favorites' ? favorites.remove(p.id) : recent.remove(p.id))}
              removeLabel={tab === 'favorites' ? 'Bỏ khỏi yêu thích' : 'Xoá khỏi lịch sử'} />
          ))}
        </div>
      )}
    </Page>
  )
}

function SavedCard({ product, index, onRemove, removeLabel }: {
  product: SavedProduct; index: number; onRemove: () => void; removeLabel: string
}) {
  return (
    <div className="relative bg-surface-container-lowest rounded-xl p-space-sm shadow-sm hover:shadow-md transition-shadow">
      <Link to={`/san-pham/${product.id}`} className="block">
        <div className="aspect-square rounded-lg overflow-hidden bg-surface-container-low mb-space-sm">
          <ProductThumb seed={index} productType={product.productType} imageUrl={product.imageUrl ?? undefined} />
        </div>
        <div className="font-title-md text-title-md text-on-surface line-clamp-2 min-h-[2.5em]">{product.name}</div>
        {product.price != null && (
          <div className="mt-1 font-price-md text-price-md text-primary">{formatPrice(product.price)}</div>
        )}
      </Link>
      <button type="button" onClick={onRemove} aria-label={removeLabel} title={removeLabel}
        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-surface-container-lowest/90 shadow-sm flex items-center justify-center text-on-surface-variant hover:text-error cursor-pointer">
        <span className="material-symbols-outlined text-lg">close</span>
      </button>
    </div>
  )
}
