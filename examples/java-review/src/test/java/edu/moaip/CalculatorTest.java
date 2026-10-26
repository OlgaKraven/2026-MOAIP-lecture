package edu.moaip;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;
class CalculatorTest {
    @Test void ordinary() { assertEquals(5, Calculator.add(2, 3)); }
    @Test void zero() { assertEquals(3, Calculator.add(0, 3)); }
    @Test void negative() { assertEquals(2, Calculator.add(-1, 3)); }
    @Test void otherFirstOperand() { assertEquals(10, Calculator.add(7, 3)); }
    @Test void counterexample() { assertEquals(6, Calculator.add(2, 4)); }
}
