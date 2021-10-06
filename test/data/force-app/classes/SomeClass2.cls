public class SomeClass2 {

    public void aMethod2() {
        new SomeClass1().aMethod('Hello World!');
    }

    public static List<Account> foo() {
        return [SELECT Id, SLA__c FROM Account WHERE SomeRandomLookup__r.aField__c = 'baz'];
    }

}