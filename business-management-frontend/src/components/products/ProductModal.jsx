import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, Package } from 'lucide-react';
import api from '../../api/axios';
import { showSuccess, showError } from '../../utils/toast';

export default function ProductModal({ product, categories, onClose }) {
  const isEditing = !!product;
  const [currencies, setCurrencies] = useState([]);
  
  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue } = useForm({
    defaultValues: {
      name: '',
      category_id: '',
      description: '',
      price: '',
      stock: '',
      currency_id: '',
    }
  });

  useEffect(() => {
    fetchCurrencies();
  }, []);

  const fetchCurrencies = async () => {
    try {
      const response = await api.get('/currencies');
      setCurrencies(response.data.data.filter(c => c.is_active));
    } catch (error) {
      console.error('Error al cargar monedas:', error);
    }
  };

  useEffect(() => {
    if (product) {
      setValue('name', product.name || '');
      setValue('category_id', product.category?.id || '');
      setValue('description', product.description || '');
      setValue('price', product.price || '');
      setValue('stock', product.stock || 0);
      setValue('currency_id', product.currency?.id || '');
    }
  }, [product, setValue]);

  const onSubmit = async (data) => {
    try {
      const payload = {
        name: data.name,
        category_id: data.category_id && data.category_id !== '' ? parseInt(data.category_id) : null,
        description: data.description || null,
        price: parseFloat(data.price),
        stock: parseInt(data.stock, 10),
        currency_id: data.currency_id && data.currency_id !== '' ? parseInt(data.currency_id) : null,
      };

      if (isEditing) {
        await api.put(`/products/${product.id}`, payload);
        showSuccess('Producto actualizado correctamente');
      } else {
        await api.post('/products', payload);
        showSuccess('Producto creado correctamente');
      }
      onClose();
    } catch (error) {
      showError('Error al guardar el producto');
      console.error('Error:', error.response?.data || error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {isEditing ? 'Actualiza la información del producto' : 'Completa los datos del nuevo producto'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nombre del Producto *
            </label>
            <input
              type="text"
              {...register('name', { required: 'El nombre es requerido' })}
              className="input"
              placeholder="Ej: Laptop Dell XPS 15"
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Categoría
            </label>
            <select
              {...register('category_id')}
              className="input"
            >
              <option value="">Sin categoría</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Moneda */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Moneda
            </label>
            <select
              {...register('currency_id')}
              className="input"
            >
              <option value="">Moneda por defecto</option>
              {currencies.map((currency) => (
                <option key={currency.id} value={currency.id}>
                  {currency.code} - {currency.name} ({currency.symbol})
                </option>
              ))}
            </select>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Descripción
            </label>
            <textarea
              {...register('description')}
              rows={3}
              className="input resize-none"
              placeholder="Descripción del producto..."
            />
          </div>

          {/* Precio y Stock */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Precio *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  {...register('price', { 
                    required: 'El precio es requerido',
                    min: { value: 0, message: 'El precio debe ser mayor a 0' }
                  })}
                  className="input pl-8"
                  placeholder="0.00"
                />
              </div>
              {errors.price && (
                <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                  <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                  {errors.price.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Stock *
              </label>
              <input
                type="number"
                step="1"
                {...register('stock', { 
                  required: 'El stock es requerido',
                  min: { value: 0, message: 'El stock debe ser mayor o igual a 0' },
                  valueAsNumber: true,
                })}
                className="input"
                placeholder="0"
              />
              {errors.stock && (
                <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                  <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                  {errors.stock.message}
                </p>
              )}
              {isEditing && (
                <p className="text-xs text-gray-500 mt-2">
                  Stock actual: <span className="font-medium">{product.stock}</span>
                </p>
              )}
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 btn btn-primary"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Guardando...
                </span>
              ) : (
                isEditing ? 'Actualizar Producto' : 'Crear Producto'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}