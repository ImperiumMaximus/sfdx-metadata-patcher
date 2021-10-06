@isTest
class SomeClass2Test {
    @isTest
    static void testAMethod2() {
        new SomeClass2().aMethod2();
    }

    @isTest
    static void testFoo() {
        System.assert(1, SomeClass2.foo().size());
    }
}