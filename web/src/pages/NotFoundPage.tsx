import { ButtonLink, Card, EmptyState, Page } from '../components/ui'

export default function NotFoundPage() {
  return (
    <Page narrow>
      <Card>
        <EmptyState
          icon="explore_off"
          title="404 — Không tìm thấy trang"
          description="Trang bạn tìm không tồn tại hoặc đã bị di chuyển."
          action={<ButtonLink to="/" icon="home">Về trang chủ</ButtonLink>}
        />
      </Card>
    </Page>
  )
}
