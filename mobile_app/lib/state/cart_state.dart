import 'package:flutter/foundation.dart';
import '../models/product.dart';

class CartLine {
  CartLine({required this.product, this.quantity = 1});

  final Product product;
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
    final index = _lines.indexWhere((l) => l.product.name == product.name);
    if (index >= 0) {
      _lines[index].quantity += quantity;
    } else {
      _lines.add(CartLine(product: product, quantity: quantity));
    }
    notifyListeners();
  }

  void updateQuantity(CartLine line, int quantity) {
    if (quantity <= 0) {
      _lines.remove(line);
    } else {
      line.quantity = quantity;
    }
    notifyListeners();
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
