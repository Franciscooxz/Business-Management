import { useEffect } from 'react';
import useNotificationStore from '../store/notificationStore';
import api from '../api/axios';

export const useStockAlerts = () => {
  const { addNotification } = useNotificationStore();

  useEffect(() => {
    const checkLowStock = async () => {
      try {
        const response = await api.get('/products', { params: { per_page: 1000 } });
        const products = response.data.data;

        const lowStockProducts = products.filter(
          (p) => p.stock > 0 && p.stock <= (p.min_stock || 5)
        );

        const outOfStockProducts = products.filter((p) => p.stock === 0);

        if (lowStockProducts.length > 0) {
          addNotification({
            type: 'stock',
            title: 'Productos con stock bajo',
            message: `${lowStockProducts.length} productos necesitan reabastecimiento`,
          });
        }

        if (outOfStockProducts.length > 0) {
          addNotification({
            type: 'stock',
            title: 'Productos sin stock',
            message: `${outOfStockProducts.length} productos están agotados`,
          });
        }
      } catch (error) {
        console.error('Error al verificar stock:', error);
      }
    };

    // Verificar al cargar
    checkLowStock();

    // Verificar cada 5 minutos
    const interval = setInterval(checkLowStock, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [addNotification]);
};