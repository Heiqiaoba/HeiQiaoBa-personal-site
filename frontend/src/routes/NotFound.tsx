/**
 * 404 页面：App.tsx 路由表中的 `*` 兜底路由对应的组件。
 * 使用 antd Result 展示「页面不存在」，并提供「回首页」按钮。
 */
import { useI18n } from '@/i18n';
import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';

/**
 * 404 页面组件。
 * @returns 含返回首页按钮的结果页 JSX
 */
export function NotFound() {
  const navigate = useNavigate();
  const { t } = useI18n();
  return (
    <Result
      status="404"
      title={t('notfound.title')}
      subTitle={t('notfound.subtitle')}
      extra={
        <Button type="primary" onClick={() => navigate('/')}>
          {t('notfound.back')}
        </Button>
      }
    />
  );
}
