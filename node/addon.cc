#include <node.h>

using namespace v8;

Handle<Value> CreateObject(const Arguments& args) {
    HandleScope scope;

    Local<Object> obj = Object::New();
    obj->Set(String::NewSymbol("msg"), args[0]->ToString());

    return scope.Close(obj);
}

Handle<Value> Method(const Arguments& args) {
    HandleScope scope;
    return scope.Close(String::New("world"));
}

void Init(Handle<Object> exports) {
    exports->Set(String::NewSymbol("hello"),
            FunctionTemplate::New(Method)->GetFunction());

    exports->Set(String::NewSymbol("exports"),
            FunctionTemplate::New(CreateObject)->GetFunction());
}

NODE_MODULE(addon, Init)