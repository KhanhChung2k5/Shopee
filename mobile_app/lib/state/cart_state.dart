import 'package:flutter/foundation.dart';
import '../models/product.dart';

class CartLine {
  CartLine({required this.product, this.quantity = 1});

  Product product;
  int quantity;

  int get lineTotal => product.price * quantity;
}

/// In-memory cart state for this demo — not wired to a backend / OrderService yet.
class CartState extends ChangeNotifier {
  final List<CartLine> _lines = [];

  List<CartLine> get lines => List.unmodifiable(_lines);

  int get itemCount => _lines.fold(0, (sum, l) => sum + l.quantity);

  int get subtotal => _lines.fold(0, (sum, l) => sum + l.lineTotal);

  void addProduct(Product product, {int quantity = 1}) {
    if (quantity <= 0 || product.availableQuantity == 0) return;
    final index = _lines.indexWhere((l) => _cartKey(l.product) == _cartKey(product));
    if (index >= 0) {
      _lines[index].product = product;
      final requested = _lines[index].quantity + quantity;
      _lines[index].quantity = _capQuantity(product, requested);
    } else {
      final capped = _capQuantity(product, quantity);
      if (capped > 0) _lines.add(CartLine(product: product, quantity: capped));
    }
    notifyListeners();
  }

  void updateQuantity(CartLine line, int quantity) {
    if (quantity <= 0) {
      _lines.remove(line);
    } else {
      final capped = _capQuantity(line.product, quantity);
      if (capped == 0) {
        _lines.remove(line);
      } else {
        line.quantity = capped;
      }
    }
    notifyListeners();
  }

  String _cartKey(Product product) => product.variantId != null
      ? 'variant:${product.variantId}'
      : product.id != null
          ? 'product:${product.id}'
          : 'name:${product.name}';

  int _capQuantity(Product product, int quantity) {
    final available = product.availableQuantity;
    return available == null ? quantity : quantity.clamp(0, available).toInt();
  }

  void removeLine(CartLine line) {
    _lines.remove(line);
    notifyListeners();
  }

  void clear() {
    _lines.clear();
    notifyListeners();
  }
}
