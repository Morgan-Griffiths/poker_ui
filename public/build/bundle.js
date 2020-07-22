
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? undefined : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        if (value != null || input.value) {
            input.value = value;
        }
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.22.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const cards = [
      "2C",
      "2D",
      "2H",
      "2S",
      "3C",
      "3D",
      "3H",
      "3S",
      "4C",
      "4D",
      "4H",
      "4S",
      "5C",
      "5D",
      "5H",
      "5S",
      "6C",
      "6D",
      "6H",
      "6S",
      "7C",
      "7D",
      "7H",
      "7S",
      "8C",
      "8D",
      "8H",
      "8S",
      "9C",
      "9D",
      "9H",
      "9S",
      "10C",
      "10D",
      "10H",
      "10S",
      "JC",
      "JD",
      "JH",
      "JS",
      "QC",
      "QD",
      "QH",
      "QS",
      "KC",
      "KD",
      "KH",
      "KS",
      "AC",
      "AD",
      "AH",
      "AS",
    ];

    function getCards(array) {
      return array.reduce((carry, value, index) => {
        let rank;
        let suit;
        if ((index + 1) % 2 !== 0) {
          rank = value;
          suit = array[index + 1];
          let cardIndex = (rank - 2) * 4 + suit;
          carry.push(cards[cardIndex]);
        }
        return carry;
      }, []);
    }

    const actions = [
        'Check',
        'Fold',
        'Call',
        'Bet',
        'Raise'
    ];

    function getAvailActions(mask) {
        return mask.reduce((carry, value, index) => {
            if (value === 1) {
                carry.push(actions[index]);
            }
            return carry;
        }, []);
    }

    /* src/ActionDialog.svelte generated by Svelte v3.22.2 */

    const file = "src/ActionDialog.svelte";

    // (53:0) {#if messageObj.action}
    function create_if_block(ctx) {
    	let div;
    	let t_value = /*messages*/ ctx[1][/*messageObj*/ ctx[0].action] + "";
    	let t;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(t_value);
    			attr_dev(div, "id", "action-dialog");
    			attr_dev(div, "class", "container svelte-1oud35h");
    			add_location(div, file, 53, 2, 1220);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    			if (remount) dispose();
    			dispose = listen_dev(div, "load", /*setTimer*/ ctx[2](), false, false, false);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*messages, messageObj*/ 3 && t_value !== (t_value = /*messages*/ ctx[1][/*messageObj*/ ctx[0].action] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(53:0) {#if messageObj.action}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let if_block_anchor;
    	let if_block = /*messageObj*/ ctx[0].action && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*messageObj*/ ctx[0].action) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function setMessages(obj) {
    	return {
    		fold: `${obj.currPlayer} has folded, ${obj.othPlayer} wins ${obj.pot}`,
    		check: `${obj.currPlayer} has checked, ${obj.othPlayer}'s turn`,
    		call: `${obj.currPlayer} has called, ${obj.othPlayer}'s turn`,
    		raise: `${obj.currPlayer} has raised ${obj.amount}, ${obj.othPlayer}'s turn`,
    		bet: `${obj.currPlayer} has bet ${obj.amount}, ${obj.othPlayer}'s turn`
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let { messageObj = {
    		currPlayer: null,
    		othPlayer: null,
    		pot: null,
    		amount: null,
    		action: null
    	} } = $$props;

    	let messages = {};

    	const setTimer = () => {
    		$$invalidate(1, messages = setMessages(messageObj));

    		setTimeout(
    			function () {
    				$$invalidate(0, messageObj = {
    					playerName: null,
    					pokerBot: false,
    					pot: null,
    					amount: null,
    					action: null
    				});
    			},
    			3000
    		);
    	};

    	
    	const writable_props = ["messageObj"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ActionDialog> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("ActionDialog", $$slots, []);

    	$$self.$set = $$props => {
    		if ("messageObj" in $$props) $$invalidate(0, messageObj = $$props.messageObj);
    	};

    	$$self.$capture_state = () => ({
    		messageObj,
    		messages,
    		setTimer,
    		setMessages
    	});

    	$$self.$inject_state = $$props => {
    		if ("messageObj" in $$props) $$invalidate(0, messageObj = $$props.messageObj);
    		if ("messages" in $$props) $$invalidate(1, messages = $$props.messages);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [messageObj, messages, setTimer];
    }

    class ActionDialog extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { messageObj: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ActionDialog",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get messageObj() {
    		throw new Error("<ActionDialog>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set messageObj(value) {
    		throw new Error("<ActionDialog>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.22.2 */

    const { console: console_1 } = globals;
    const file$1 = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[27] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[27] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[32] = list[i];
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[32] = list[i];
    	return child_ctx;
    }

    function get_each_context_5(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[32] = list[i];
    	return child_ctx;
    }

    function get_each_context_4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[37] = list[i];
    	return child_ctx;
    }

    // (153:2) {:else}
    function create_else_block(ctx) {
    	let div1;
    	let div0;
    	let t0;
    	let div4;
    	let div3;
    	let div2;
    	let t1;
    	let t2;
    	let hr0;
    	let t3;
    	let p0;
    	let t4;
    	let t5_value = /*villain*/ ctx[6].bank + "";
    	let t5;
    	let t6;
    	let div7;
    	let div5;
    	let img;
    	let img_src_value;
    	let t7;
    	let span0;
    	let t8;
    	let t9;
    	let t10;
    	let div6;
    	let t11;
    	let t12;
    	let div9;
    	let div8;
    	let t13;
    	let div16;
    	let div11;
    	let div10;
    	let span1;
    	let t15;
    	let input;
    	let t16;
    	let span2;
    	let t17;
    	let t18;
    	let div11_class_value;
    	let t19;
    	let div12;
    	let div12_class_value;
    	let t20;
    	let div14;
    	let div13;
    	let t21;
    	let t22;
    	let t23;
    	let hr1;
    	let t24;
    	let p1;
    	let t25;
    	let t26_value = /*hero*/ ctx[7].bank + "";
    	let t26;
    	let t27;
    	let div15;
    	let div15_class_value;
    	let current;
    	let dispose;

    	function select_block_type_1(ctx, dirty) {
    		if (/*villain*/ ctx[6].hand.length === 0) return create_if_block_8;
    		return create_else_block_1;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block0 = current_block_type(ctx);
    	let if_block1 = /*villain*/ ctx[6].dealer && create_if_block_7(ctx);

    	const actiondialog = new ActionDialog({
    			props: { messageObj: /*messageObj*/ ctx[10] },
    			$$inline: true
    		});

    	let each_value_3 = /*community*/ ctx[11];
    	validate_each_argument(each_value_3);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks_1[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
    	}

    	let each_value_2 = /*hero*/ ctx[7].hand;
    	validate_each_argument(each_value_2);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	let if_block2 = /*availActions*/ ctx[13] && create_if_block_5(ctx);
    	let if_block3 = /*hero*/ ctx[7].dealer && create_if_block_4(ctx);
    	let if_block4 = /*availActions*/ ctx[13] && create_if_block_2(ctx);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			if_block0.c();
    			t0 = space();
    			div4 = element("div");
    			div3 = element("div");
    			div2 = element("div");
    			t1 = text("Morgan's Poker Bot\n          ");
    			if (if_block1) if_block1.c();
    			t2 = space();
    			hr0 = element("hr");
    			t3 = space();
    			p0 = element("p");
    			t4 = text("$");
    			t5 = text(t5_value);
    			t6 = space();
    			div7 = element("div");
    			div5 = element("div");
    			img = element("img");
    			t7 = space();
    			span0 = element("span");
    			t8 = text("$");
    			t9 = text(/*pot*/ ctx[4]);
    			t10 = space();
    			div6 = element("div");
    			create_component(actiondialog.$$.fragment);
    			t11 = space();

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t12 = space();
    			div9 = element("div");
    			div8 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t13 = space();
    			div16 = element("div");
    			div11 = element("div");
    			div10 = element("div");
    			span1 = element("span");
    			span1.textContent = "$0";
    			t15 = space();
    			input = element("input");
    			t16 = space();
    			span2 = element("span");
    			t17 = text("$");
    			t18 = text(/*maxBet*/ ctx[9]);
    			t19 = space();
    			div12 = element("div");
    			if (if_block2) if_block2.c();
    			t20 = space();
    			div14 = element("div");
    			div13 = element("div");
    			t21 = text(/*playerName*/ ctx[1]);
    			t22 = space();
    			if (if_block3) if_block3.c();
    			t23 = space();
    			hr1 = element("hr");
    			t24 = space();
    			p1 = element("p");
    			t25 = text("$");
    			t26 = text(t26_value);
    			t27 = space();
    			div15 = element("div");
    			if (if_block4) if_block4.c();
    			attr_dev(div0, "id", "villian");
    			attr_dev(div0, "class", "hand");
    			set_style(div0, "width", /*pokerBotHandWidth*/ ctx[2] + "px");
    			add_location(div0, file$1, 154, 6, 4226);
    			attr_dev(div1, "class", "container no-margin-bottom");
    			add_location(div1, file$1, 153, 4, 4179);
    			attr_dev(div2, "class", "d-flex justify-center");
    			set_style(div2, "margin-bottom", "8px");
    			add_location(div2, file$1, 172, 8, 4882);
    			add_location(hr0, file$1, 178, 8, 5089);
    			add_location(p0, file$1, 179, 8, 5104);
    			attr_dev(div3, "id", "villian-info");
    			attr_dev(div3, "class", "d-flex column");
    			add_location(div3, file$1, 171, 6, 4828);
    			attr_dev(div4, "class", "container no-margin-bottom no-margin-top");
    			add_location(div4, file$1, 170, 4, 4767);
    			if (img.src !== (img_src_value = "images/poker-chip.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Poker Chip");
    			attr_dev(img, "height", "105%");
    			set_style(img, "margin-right", "10px");
    			add_location(img, file$1, 184, 8, 5225);
    			add_location(span0, file$1, 189, 8, 5366);
    			attr_dev(div5, "id", "pot");
    			attr_dev(div5, "class", /*potClass*/ ctx[14]);
    			add_location(div5, file$1, 183, 6, 5185);
    			attr_dev(div6, "id", "community");
    			attr_dev(div6, "class", "hand");
    			add_location(div6, file$1, 191, 6, 5405);
    			attr_dev(div7, "class", "container");
    			add_location(div7, file$1, 182, 4, 5155);
    			attr_dev(div8, "id", "hero");
    			attr_dev(div8, "class", "hand");
    			set_style(div8, "width", /*heroHandWidth*/ ctx[3] + "px");
    			add_location(div8, file$1, 201, 6, 5719);
    			attr_dev(div9, "class", "container no-margin-bottom");
    			add_location(div9, file$1, 200, 4, 5672);
    			add_location(span1, file$1, 214, 10, 6216);
    			attr_dev(input, "type", "range");
    			attr_dev(input, "min", "0");
    			attr_dev(input, "max", /*maxBet*/ ctx[9]);
    			attr_dev(input, "step", "1");
    			add_location(input, file$1, 215, 10, 6242);
    			add_location(span2, file$1, 222, 10, 6420);
    			attr_dev(div10, "class", "input-wrapper d-flex justify-center");
    			add_location(div10, file$1, 213, 8, 6156);
    			attr_dev(div11, "id", "bet-slider");
    			attr_dev(div11, "class", div11_class_value = "" + (/*heroActiveClass*/ ctx[5] + " d-flex justify-center flex-wrap"));
    			add_location(div11, file$1, 210, 6, 6052);
    			attr_dev(div12, "class", div12_class_value = "left " + /*heroActiveClass*/ ctx[5] + " actions d-flex align-center");
    			add_location(div12, file$1, 225, 6, 6477);
    			attr_dev(div13, "class", "d-flex justify-center");
    			set_style(div13, "margin-bottom", "8px");
    			add_location(div13, file$1, 240, 8, 6996);
    			add_location(hr1, file$1, 246, 8, 7194);
    			add_location(p1, file$1, 247, 8, 7209);
    			attr_dev(div14, "id", "hero-info");
    			attr_dev(div14, "class", "d-flex column");
    			add_location(div14, file$1, 239, 6, 6945);
    			attr_dev(div15, "class", div15_class_value = "right " + /*heroActiveClass*/ ctx[5] + " actions d-flex align-center");
    			add_location(div15, file$1, 249, 6, 7248);
    			attr_dev(div16, "class", "container d-flex justify-center flex-wrap no-margin-top");
    			add_location(div16, file$1, 209, 4, 5976);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			if_block0.m(div0, null);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div3);
    			append_dev(div3, div2);
    			append_dev(div2, t1);
    			if (if_block1) if_block1.m(div2, null);
    			append_dev(div3, t2);
    			append_dev(div3, hr0);
    			append_dev(div3, t3);
    			append_dev(div3, p0);
    			append_dev(p0, t4);
    			append_dev(p0, t5);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, div7, anchor);
    			append_dev(div7, div5);
    			append_dev(div5, img);
    			append_dev(div5, t7);
    			append_dev(div5, span0);
    			append_dev(span0, t8);
    			append_dev(span0, t9);
    			append_dev(div7, t10);
    			append_dev(div7, div6);
    			mount_component(actiondialog, div6, null);
    			append_dev(div6, t11);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(div6, null);
    			}

    			insert_dev(target, t12, anchor);
    			insert_dev(target, div9, anchor);
    			append_dev(div9, div8);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div8, null);
    			}

    			insert_dev(target, t13, anchor);
    			insert_dev(target, div16, anchor);
    			append_dev(div16, div11);
    			append_dev(div11, div10);
    			append_dev(div10, span1);
    			append_dev(div10, t15);
    			append_dev(div10, input);
    			set_input_value(input, /*betSize*/ ctx[8]);
    			append_dev(div10, t16);
    			append_dev(div10, span2);
    			append_dev(span2, t17);
    			append_dev(span2, t18);
    			append_dev(div16, t19);
    			append_dev(div16, div12);
    			if (if_block2) if_block2.m(div12, null);
    			append_dev(div16, t20);
    			append_dev(div16, div14);
    			append_dev(div14, div13);
    			append_dev(div13, t21);
    			append_dev(div13, t22);
    			if (if_block3) if_block3.m(div13, null);
    			append_dev(div14, t23);
    			append_dev(div14, hr1);
    			append_dev(div14, t24);
    			append_dev(div14, p1);
    			append_dev(p1, t25);
    			append_dev(p1, t26);
    			append_dev(div16, t27);
    			append_dev(div16, div15);
    			if (if_block4) if_block4.m(div15, null);
    			current = true;
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(input, "change", /*input_change_input_handler*/ ctx[24]),
    				listen_dev(input, "input", /*input_change_input_handler*/ ctx[24]),
    				listen_dev(input, "input", /*checkAllIn*/ ctx[19], false, false, false)
    			];
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block0) {
    				if_block0.p(ctx, dirty);
    			} else {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(div0, null);
    				}
    			}

    			if (!current || dirty[0] & /*pokerBotHandWidth*/ 4) {
    				set_style(div0, "width", /*pokerBotHandWidth*/ ctx[2] + "px");
    			}

    			if (/*villain*/ ctx[6].dealer) {
    				if (if_block1) ; else {
    					if_block1 = create_if_block_7(ctx);
    					if_block1.c();
    					if_block1.m(div2, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if ((!current || dirty[0] & /*villain*/ 64) && t5_value !== (t5_value = /*villain*/ ctx[6].bank + "")) set_data_dev(t5, t5_value);
    			if (!current || dirty[0] & /*pot*/ 16) set_data_dev(t9, /*pot*/ ctx[4]);

    			if (!current || dirty[0] & /*potClass*/ 16384) {
    				attr_dev(div5, "class", /*potClass*/ ctx[14]);
    			}

    			const actiondialog_changes = {};
    			if (dirty[0] & /*messageObj*/ 1024) actiondialog_changes.messageObj = /*messageObj*/ ctx[10];
    			actiondialog.$set(actiondialog_changes);

    			if (dirty[0] & /*community*/ 2048) {
    				each_value_3 = /*community*/ ctx[11];
    				validate_each_argument(each_value_3);
    				let i;

    				for (i = 0; i < each_value_3.length; i += 1) {
    					const child_ctx = get_each_context_3(ctx, each_value_3, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_3(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(div6, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_3.length;
    			}

    			if (dirty[0] & /*hero*/ 128) {
    				each_value_2 = /*hero*/ ctx[7].hand;
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div8, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_2.length;
    			}

    			if (!current || dirty[0] & /*heroHandWidth*/ 8) {
    				set_style(div8, "width", /*heroHandWidth*/ ctx[3] + "px");
    			}

    			if (!current || dirty[0] & /*maxBet*/ 512) {
    				attr_dev(input, "max", /*maxBet*/ ctx[9]);
    			}

    			if (dirty[0] & /*betSize*/ 256) {
    				set_input_value(input, /*betSize*/ ctx[8]);
    			}

    			if (!current || dirty[0] & /*maxBet*/ 512) set_data_dev(t18, /*maxBet*/ ctx[9]);

    			if (!current || dirty[0] & /*heroActiveClass*/ 32 && div11_class_value !== (div11_class_value = "" + (/*heroActiveClass*/ ctx[5] + " d-flex justify-center flex-wrap"))) {
    				attr_dev(div11, "class", div11_class_value);
    			}

    			if (/*availActions*/ ctx[13]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_5(ctx);
    					if_block2.c();
    					if_block2.m(div12, null);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (!current || dirty[0] & /*heroActiveClass*/ 32 && div12_class_value !== (div12_class_value = "left " + /*heroActiveClass*/ ctx[5] + " actions d-flex align-center")) {
    				attr_dev(div12, "class", div12_class_value);
    			}

    			if (!current || dirty[0] & /*playerName*/ 2) set_data_dev(t21, /*playerName*/ ctx[1]);

    			if (/*hero*/ ctx[7].dealer) {
    				if (if_block3) ; else {
    					if_block3 = create_if_block_4(ctx);
    					if_block3.c();
    					if_block3.m(div13, null);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}

    			if ((!current || dirty[0] & /*hero*/ 128) && t26_value !== (t26_value = /*hero*/ ctx[7].bank + "")) set_data_dev(t26, t26_value);

    			if (/*availActions*/ ctx[13]) {
    				if (if_block4) {
    					if_block4.p(ctx, dirty);
    				} else {
    					if_block4 = create_if_block_2(ctx);
    					if_block4.c();
    					if_block4.m(div15, null);
    				}
    			} else if (if_block4) {
    				if_block4.d(1);
    				if_block4 = null;
    			}

    			if (!current || dirty[0] & /*heroActiveClass*/ 32 && div15_class_value !== (div15_class_value = "right " + /*heroActiveClass*/ ctx[5] + " actions d-flex align-center")) {
    				attr_dev(div15, "class", div15_class_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(actiondialog.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(actiondialog.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if_block0.d();
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div4);
    			if (if_block1) if_block1.d();
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(div7);
    			destroy_component(actiondialog);
    			destroy_each(each_blocks_1, detaching);
    			if (detaching) detach_dev(t12);
    			if (detaching) detach_dev(div9);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t13);
    			if (detaching) detach_dev(div16);
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    			if (if_block4) if_block4.d();
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(153:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (144:32) 
    function create_if_block_1(ctx) {
    	let div1;
    	let h1;
    	let t1;
    	let ul;
    	let li;
    	let div0;
    	let dispose;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Pick A Game";
    			t1 = space();
    			ul = element("ul");
    			li = element("li");
    			div0 = element("div");
    			div0.textContent = "Omaha";
    			add_location(h1, file$1, 145, 6, 3982);
    			attr_dev(div0, "class", "btn hover-effect");
    			add_location(div0, file$1, 148, 10, 4086);
    			add_location(li, file$1, 147, 8, 4037);
    			attr_dev(ul, "id", "game-menu");
    			add_location(ul, file$1, 146, 6, 4009);
    			attr_dev(div1, "class", "container text-center");
    			add_location(div1, file$1, 144, 4, 3940);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, h1);
    			append_dev(div1, t1);
    			append_dev(div1, ul);
    			append_dev(ul, li);
    			append_dev(li, div0);
    			if (remount) dispose();
    			dispose = listen_dev(li, "click", /*click_handler*/ ctx[23], false, false, false);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(144:32) ",
    		ctx
    	});

    	return block;
    }

    // (134:2) {#if !game && !playerName}
    function create_if_block$1(ctx) {
    	let div3;
    	let h1;
    	let t1;
    	let div0;
    	let input;
    	let t2;
    	let div2;
    	let div1;
    	let dispose;

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Enter Your Name";
    			t1 = space();
    			div0 = element("div");
    			input = element("input");
    			t2 = space();
    			div2 = element("div");
    			div1 = element("div");
    			div1.textContent = "Play";
    			add_location(h1, file$1, 135, 6, 3668);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "id", "hero-name");
    			add_location(input, file$1, 137, 8, 3729);
    			attr_dev(div0, "id", "name-field");
    			add_location(div0, file$1, 136, 6, 3699);
    			attr_dev(div1, "class", "btn hover-effect");
    			add_location(div1, file$1, 140, 8, 3819);
    			attr_dev(div2, "class", "btn-wrapper");
    			add_location(div2, file$1, 139, 6, 3785);
    			attr_dev(div3, "class", "container text-center");
    			add_location(div3, file$1, 134, 4, 3626);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, h1);
    			append_dev(div3, t1);
    			append_dev(div3, div0);
    			append_dev(div0, input);
    			append_dev(div3, t2);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			if (remount) dispose();
    			dispose = listen_dev(div1, "click", /*setName*/ ctx[15], false, false, false);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(134:2) {#if !game && !playerName}",
    		ctx
    	});

    	return block;
    }

    // (162:8) {:else}
    function create_else_block_1(ctx) {
    	let each_1_anchor;
    	let each_value_5 = /*villain*/ ctx[6].hand;
    	validate_each_argument(each_value_5);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_5.length; i += 1) {
    		each_blocks[i] = create_each_block_5(get_each_context_5(ctx, each_value_5, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*villain*/ 64) {
    				each_value_5 = /*villain*/ ctx[6].hand;
    				validate_each_argument(each_value_5);
    				let i;

    				for (i = 0; i < each_value_5.length; i += 1) {
    					const child_ctx = get_each_context_5(ctx, each_value_5, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_5(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_5.length;
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(162:8) {:else}",
    		ctx
    	});

    	return block;
    }

    // (156:8) {#if villain.hand.length === 0}
    function create_if_block_8(ctx) {
    	let each_1_anchor;
    	let each_value_4 = Array(/*playerNumCards*/ ctx[12]);
    	validate_each_argument(each_value_4);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_4.length; i += 1) {
    		each_blocks[i] = create_each_block_4(get_each_context_4(ctx, each_value_4, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*playerNumCards*/ 4096) {
    				const old_length = each_value_4.length;
    				each_value_4 = Array(/*playerNumCards*/ ctx[12]);
    				validate_each_argument(each_value_4);
    				let i;

    				for (i = old_length; i < each_value_4.length; i += 1) {
    					const child_ctx = get_each_context_4(ctx, each_value_4, i);

    					if (!each_blocks[i]) {
    						each_blocks[i] = create_each_block_4(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (i = each_value_4.length; i < old_length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_4.length;
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_8.name,
    		type: "if",
    		source: "(156:8) {#if villain.hand.length === 0}",
    		ctx
    	});

    	return block;
    }

    // (163:10) {#each villain.hand as card}
    function create_each_block_5(ctx) {
    	let div;
    	let img;
    	let img_src_value;
    	let img_alt_value;
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			img = element("img");
    			t = space();
    			if (img.src !== (img_src_value = "images/cards/" + /*card*/ ctx[32] + ".png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", img_alt_value = /*card*/ ctx[32]);
    			add_location(img, file$1, 164, 14, 4639);
    			attr_dev(div, "class", "card-container");
    			add_location(div, file$1, 163, 12, 4596);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, img);
    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*villain*/ 64 && img.src !== (img_src_value = "images/cards/" + /*card*/ ctx[32] + ".png")) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty[0] & /*villain*/ 64 && img_alt_value !== (img_alt_value = /*card*/ ctx[32])) {
    				attr_dev(img, "alt", img_alt_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_5.name,
    		type: "each",
    		source: "(163:10) {#each villain.hand as card}",
    		ctx
    	});

    	return block;
    }

    // (157:10) {#each Array(playerNumCards) as _}
    function create_each_block_4(ctx) {
    	let div;
    	let img;
    	let img_src_value;
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			img = element("img");
    			t = space();
    			if (img.src !== (img_src_value = "images/cards/card_back.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Card Back");
    			add_location(img, file$1, 158, 14, 4435);
    			attr_dev(div, "class", "card-container");
    			add_location(div, file$1, 157, 12, 4392);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, img);
    			append_dev(div, t);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_4.name,
    		type: "each",
    		source: "(157:10) {#each Array(playerNumCards) as _}",
    		ctx
    	});

    	return block;
    }

    // (175:10) {#if villain.dealer}
    function create_if_block_7(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "D";
    			attr_dev(div, "class", "dealer-chip");
    			add_location(div, file$1, 175, 12, 5017);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_7.name,
    		type: "if",
    		source: "(175:10) {#if villain.dealer}",
    		ctx
    	});

    	return block;
    }

    // (194:8) {#each community as card}
    function create_each_block_3(ctx) {
    	let div;
    	let img;
    	let img_src_value;
    	let img_alt_value;
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			img = element("img");
    			t = space();
    			if (img.src !== (img_src_value = "images/cards/" + /*card*/ ctx[32] + ".png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", img_alt_value = /*card*/ ctx[32]);
    			add_location(img, file$1, 195, 12, 5562);
    			attr_dev(div, "class", "card-container");
    			add_location(div, file$1, 194, 10, 5521);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, img);
    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*community*/ 2048 && img.src !== (img_src_value = "images/cards/" + /*card*/ ctx[32] + ".png")) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty[0] & /*community*/ 2048 && img_alt_value !== (img_alt_value = /*card*/ ctx[32])) {
    				attr_dev(img, "alt", img_alt_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_3.name,
    		type: "each",
    		source: "(194:8) {#each community as card}",
    		ctx
    	});

    	return block;
    }

    // (203:8) {#each hero.hand as card}
    function create_each_block_2(ctx) {
    	let div;
    	let img;
    	let img_src_value;
    	let img_alt_value;
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			img = element("img");
    			t = space();
    			if (img.src !== (img_src_value = "images/cards/" + /*card*/ ctx[32] + ".png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", img_alt_value = /*card*/ ctx[32]);
    			add_location(img, file$1, 204, 12, 5866);
    			attr_dev(div, "class", "card-container");
    			add_location(div, file$1, 203, 10, 5825);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, img);
    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*hero*/ 128 && img.src !== (img_src_value = "images/cards/" + /*card*/ ctx[32] + ".png")) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty[0] & /*hero*/ 128 && img_alt_value !== (img_alt_value = /*card*/ ctx[32])) {
    				attr_dev(img, "alt", img_alt_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(203:8) {#each hero.hand as card}",
    		ctx
    	});

    	return block;
    }

    // (227:8) {#if availActions}
    function create_if_block_5(ctx) {
    	let each_1_anchor;
    	let each_value_1 = /*divideActions*/ ctx[17]("left");
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*endTurn, divideActions, betSize*/ 393472) {
    				each_value_1 = /*divideActions*/ ctx[17]("left");
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(227:8) {#if availActions}",
    		ctx
    	});

    	return block;
    }

    // (234:16) {#if action === 'Bet' || action === 'Raise'}
    function create_if_block_6(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text(/*betSize*/ ctx[8]);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*betSize*/ 256) set_data_dev(t, /*betSize*/ ctx[8]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(234:16) {#if action === 'Bet' || action === 'Raise'}",
    		ctx
    	});

    	return block;
    }

    // (228:10) {#each divideActions('left') as action}
    function create_each_block_1(ctx) {
    	let div;
    	let span;
    	let t0_value = /*action*/ ctx[27] + "";
    	let t0;
    	let t1;
    	let t2;
    	let dispose;
    	let if_block = (/*action*/ ctx[27] === "Bet" || /*action*/ ctx[27] === "Raise") && create_if_block_6(ctx);

    	function click_handler_1(...args) {
    		return /*click_handler_1*/ ctx[25](/*action*/ ctx[27], ...args);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			span = element("span");
    			t0 = text(t0_value);
    			t1 = space();
    			if (if_block) if_block.c();
    			t2 = space();
    			add_location(span, file$1, 231, 14, 6746);
    			attr_dev(div, "class", "btn hover-effect");
    			add_location(div, file$1, 228, 12, 6631);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span);
    			append_dev(span, t0);
    			append_dev(span, t1);
    			if (if_block) if_block.m(span, null);
    			append_dev(div, t2);
    			if (remount) dispose();
    			dispose = listen_dev(div, "click", click_handler_1, false, false, false);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (/*action*/ ctx[27] === "Bet" || /*action*/ ctx[27] === "Raise") if_block.p(ctx, dirty);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block) if_block.d();
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(228:10) {#each divideActions('left') as action}",
    		ctx
    	});

    	return block;
    }

    // (243:10) {#if hero.dealer}
    function create_if_block_4(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "D";
    			attr_dev(div, "class", "dealer-chip");
    			add_location(div, file$1, 243, 12, 7122);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(243:10) {#if hero.dealer}",
    		ctx
    	});

    	return block;
    }

    // (251:8) {#if availActions}
    function create_if_block_2(ctx) {
    	let each_1_anchor;
    	let each_value = /*divideActions*/ ctx[17]("right");
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*endTurn, divideActions, betSize*/ 393472) {
    				each_value = /*divideActions*/ ctx[17]("right");
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(251:8) {#if availActions}",
    		ctx
    	});

    	return block;
    }

    // (258:16) {#if action === 'Bet' || action === 'Raise'}
    function create_if_block_3(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text(/*betSize*/ ctx[8]);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*betSize*/ 256) set_data_dev(t, /*betSize*/ ctx[8]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(258:16) {#if action === 'Bet' || action === 'Raise'}",
    		ctx
    	});

    	return block;
    }

    // (252:10) {#each divideActions('right') as action}
    function create_each_block(ctx) {
    	let div;
    	let span;
    	let t0_value = /*action*/ ctx[27] + "";
    	let t0;
    	let t1;
    	let t2;
    	let dispose;
    	let if_block = (/*action*/ ctx[27] === "Bet" || /*action*/ ctx[27] === "Raise") && create_if_block_3(ctx);

    	function click_handler_2(...args) {
    		return /*click_handler_2*/ ctx[26](/*action*/ ctx[27], ...args);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			span = element("span");
    			t0 = text(t0_value);
    			t1 = space();
    			if (if_block) if_block.c();
    			t2 = space();
    			add_location(span, file$1, 255, 14, 7519);
    			attr_dev(div, "class", "btn hover-effect");
    			add_location(div, file$1, 252, 12, 7404);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span);
    			append_dev(span, t0);
    			append_dev(span, t1);
    			if (if_block) if_block.m(span, null);
    			append_dev(div, t2);
    			if (remount) dispose();
    			dispose = listen_dev(div, "click", click_handler_2, false, false, false);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (/*action*/ ctx[27] === "Bet" || /*action*/ ctx[27] === "Raise") if_block.p(ctx, dirty);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block) if_block.d();
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(252:10) {#each divideActions('right') as action}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div;
    	let current_block_type_index;
    	let if_block;
    	let current;
    	const if_block_creators = [create_if_block$1, create_if_block_1, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (!/*game*/ ctx[0] && !/*playerName*/ ctx[1]) return 0;
    		if (!/*game*/ ctx[0] && /*playerName*/ ctx[1]) return 1;
    		return 2;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if_block.c();
    			attr_dev(div, "id", "table");
    			add_location(div, file$1, 132, 0, 3576);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if_blocks[current_block_type_index].m(div, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(div, null);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_blocks[current_block_type_index].d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { game = null } = $$props;
    	let { playerName = null } = $$props;
    	let playerNumCards;
    	let availActions;
    	let { pokerBotHandWidth } = $$props;
    	let { heroHandWidth } = $$props;
    	let { pot = 0 } = $$props;
    	let potClass;
    	let heroTurn;
    	let { heroActiveClass = "inactive" } = $$props;
    	let { villain = { hand: [], bank: 1000, dealer: true } } = $$props;
    	let { hero = { hand: [], bank: 1000, dealer: false } } = $$props;
    	let { community = [] } = $$props;
    	let { betSize = 0 } = $$props;
    	let { maxBet } = $$props;
    	let { allIn } = $$props;
    	let showdown;

    	let { messageObj = {
    		currPlayer: null,
    		othPlayer: null,
    		pot: null,
    		amount: null,
    		action: null
    	} } = $$props;

    	async function setName() {
    		let value = document.getElementById("hero-name").value;
    		$$invalidate(1, playerName = value);

    		const res = await fetch("http://localhost:4000/api/player/name", {
    			method: "POST",
    			body: JSON.stringify({ name: playerName })
    		});
    	}

    	async function setGame(name) {
    		$$invalidate(0, game = name);
    		const res = await fetch("http://localhost:4000/api/reset");
    		let text = await res.text();
    		let data = JSON.parse(text);
    		const { state } = data;
    		$$invalidate(12, playerNumCards = state.hero_cards.length / 2);
    		$$invalidate(13, availActions = getAvailActions(state.action_mask));
    		$$invalidate(7, hero.hand = await getCards(state.hero_cards), hero);
    		$$invalidate(7, hero.bank = state.hero_stack, hero);
    		$$invalidate(7, hero.dealer = state.hero_position == 0 ? true : false, hero);
    		$$invalidate(6, villain.bank = state.villain_stack, villain);
    		$$invalidate(6, villain.dealer = state.villain_position == 0 ? true : false, villain);
    		$$invalidate(4, pot = state.pot);
    		$$invalidate(14, potClass = "active");
    		$$invalidate(5, heroActiveClass = "active");
    	}

    	function divideActions(side) {
    		if (availActions.length > 2) {
    			if (side === "left") {
    				return availActions.slice(0, 2);
    			}

    			return availActions.slice(2);
    		} else {
    			if (side === "left") {
    				return availActions.slice(0, 1);
    			}

    			return availActions.slice(1);
    		}
    	}

    	async function endTurn(action, betSize) {
    		action = action.slice(0, 1).toLowerCase() + action.slice(1);
    		$$invalidate(5, heroActiveClass = "inactive");
    		$$invalidate(10, messageObj.currPlayer = playerName, messageObj);
    		$$invalidate(10, messageObj.othPlayer = "PokerBot", messageObj);
    		$$invalidate(10, messageObj.action = action, messageObj);

    		if (betSize > 0) {
    			$$invalidate(10, messageObj.amount = betSize, messageObj);
    		} else {
    			if (action === "fold") {
    				$$invalidate(10, messageObj.amount = pot, messageObj);
    			}

    			$$invalidate(10, messageObj.amount = null, messageObj);
    		}

    		$$invalidate(10, messageObj.action = action, messageObj);

    		const res = await fetch("http://localhost:4000/api/step", {
    			method: "POST",
    			body: JSON.stringify({ action, betsize: betSize })
    		});

    		let text = await res.text();
    		let data = JSON.parse(text);
    		const { state } = data;

    		setTimeout(
    			function () {
    				console.log(state);

    				// messageObj.currPlayer = 'PokerBot';
    				// messageObj.othPlayer = playerName;
    				// messageObj.action = `${state.action}s`;
    				// betSize > 0 ? messageObj.amount = betSize : messageObj.amount = null;
    				// messageObj.action = state.action;
    				$$invalidate(13, availActions = getAvailActions(state.action_mask));

    				$$invalidate(4, pot = state.pot);
    				$$invalidate(6, villain.bank = state.villain_stack, villain);
    				$$invalidate(5, heroActiveClass = "active");
    			},
    			3000
    		);
    	}

    	function checkAllIn() {
    		if (betSize === hero.bank) {
    			$$invalidate(20, allIn = true);
    		} else {
    			$$invalidate(20, allIn = false);
    		}
    	}

    	const writable_props = [
    		"game",
    		"playerName",
    		"pokerBotHandWidth",
    		"heroHandWidth",
    		"pot",
    		"heroActiveClass",
    		"villain",
    		"hero",
    		"community",
    		"betSize",
    		"maxBet",
    		"allIn",
    		"messageObj"
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);
    	const click_handler = () => setGame("omaha");

    	function input_change_input_handler() {
    		betSize = to_number(this.value);
    		$$invalidate(8, betSize);
    	}

    	const click_handler_1 = action => endTurn(action, betSize);
    	const click_handler_2 = action => endTurn(action, betSize);

    	$$self.$set = $$props => {
    		if ("game" in $$props) $$invalidate(0, game = $$props.game);
    		if ("playerName" in $$props) $$invalidate(1, playerName = $$props.playerName);
    		if ("pokerBotHandWidth" in $$props) $$invalidate(2, pokerBotHandWidth = $$props.pokerBotHandWidth);
    		if ("heroHandWidth" in $$props) $$invalidate(3, heroHandWidth = $$props.heroHandWidth);
    		if ("pot" in $$props) $$invalidate(4, pot = $$props.pot);
    		if ("heroActiveClass" in $$props) $$invalidate(5, heroActiveClass = $$props.heroActiveClass);
    		if ("villain" in $$props) $$invalidate(6, villain = $$props.villain);
    		if ("hero" in $$props) $$invalidate(7, hero = $$props.hero);
    		if ("community" in $$props) $$invalidate(11, community = $$props.community);
    		if ("betSize" in $$props) $$invalidate(8, betSize = $$props.betSize);
    		if ("maxBet" in $$props) $$invalidate(9, maxBet = $$props.maxBet);
    		if ("allIn" in $$props) $$invalidate(20, allIn = $$props.allIn);
    		if ("messageObj" in $$props) $$invalidate(10, messageObj = $$props.messageObj);
    	};

    	$$self.$capture_state = () => ({
    		getCards,
    		getAvailActions,
    		ActionDialog,
    		game,
    		playerName,
    		playerNumCards,
    		availActions,
    		pokerBotHandWidth,
    		heroHandWidth,
    		pot,
    		potClass,
    		heroTurn,
    		heroActiveClass,
    		villain,
    		hero,
    		community,
    		betSize,
    		maxBet,
    		allIn,
    		showdown,
    		messageObj,
    		setName,
    		setGame,
    		divideActions,
    		endTurn,
    		checkAllIn
    	});

    	$$self.$inject_state = $$props => {
    		if ("game" in $$props) $$invalidate(0, game = $$props.game);
    		if ("playerName" in $$props) $$invalidate(1, playerName = $$props.playerName);
    		if ("playerNumCards" in $$props) $$invalidate(12, playerNumCards = $$props.playerNumCards);
    		if ("availActions" in $$props) $$invalidate(13, availActions = $$props.availActions);
    		if ("pokerBotHandWidth" in $$props) $$invalidate(2, pokerBotHandWidth = $$props.pokerBotHandWidth);
    		if ("heroHandWidth" in $$props) $$invalidate(3, heroHandWidth = $$props.heroHandWidth);
    		if ("pot" in $$props) $$invalidate(4, pot = $$props.pot);
    		if ("potClass" in $$props) $$invalidate(14, potClass = $$props.potClass);
    		if ("heroTurn" in $$props) heroTurn = $$props.heroTurn;
    		if ("heroActiveClass" in $$props) $$invalidate(5, heroActiveClass = $$props.heroActiveClass);
    		if ("villain" in $$props) $$invalidate(6, villain = $$props.villain);
    		if ("hero" in $$props) $$invalidate(7, hero = $$props.hero);
    		if ("community" in $$props) $$invalidate(11, community = $$props.community);
    		if ("betSize" in $$props) $$invalidate(8, betSize = $$props.betSize);
    		if ("maxBet" in $$props) $$invalidate(9, maxBet = $$props.maxBet);
    		if ("allIn" in $$props) $$invalidate(20, allIn = $$props.allIn);
    		if ("showdown" in $$props) showdown = $$props.showdown;
    		if ("messageObj" in $$props) $$invalidate(10, messageObj = $$props.messageObj);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*playerNumCards*/ 4096) {
    			 $$invalidate(2, pokerBotHandWidth = playerNumCards * 60 + 40);
    		}

    		if ($$self.$$.dirty[0] & /*playerNumCards*/ 4096) {
    			 $$invalidate(3, heroHandWidth = playerNumCards * 100 + 60);
    		}

    		if ($$self.$$.dirty[0] & /*hero*/ 128) {
    			 $$invalidate(9, maxBet = hero.bank);
    		}

    		if ($$self.$$.dirty[0] & /*betSize, hero*/ 384) {
    			 $$invalidate(20, allIn = betSize === hero.bank ? true : false);
    		}
    	};

    	return [
    		game,
    		playerName,
    		pokerBotHandWidth,
    		heroHandWidth,
    		pot,
    		heroActiveClass,
    		villain,
    		hero,
    		betSize,
    		maxBet,
    		messageObj,
    		community,
    		playerNumCards,
    		availActions,
    		potClass,
    		setName,
    		setGame,
    		divideActions,
    		endTurn,
    		checkAllIn,
    		allIn,
    		heroTurn,
    		showdown,
    		click_handler,
    		input_change_input_handler,
    		click_handler_1,
    		click_handler_2
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(
    			this,
    			options,
    			instance$1,
    			create_fragment$1,
    			safe_not_equal,
    			{
    				game: 0,
    				playerName: 1,
    				pokerBotHandWidth: 2,
    				heroHandWidth: 3,
    				pot: 4,
    				heroActiveClass: 5,
    				villain: 6,
    				hero: 7,
    				community: 11,
    				betSize: 8,
    				maxBet: 9,
    				allIn: 20,
    				messageObj: 10
    			},
    			[-1, -1]
    		);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*pokerBotHandWidth*/ ctx[2] === undefined && !("pokerBotHandWidth" in props)) {
    			console_1.warn("<App> was created without expected prop 'pokerBotHandWidth'");
    		}

    		if (/*heroHandWidth*/ ctx[3] === undefined && !("heroHandWidth" in props)) {
    			console_1.warn("<App> was created without expected prop 'heroHandWidth'");
    		}

    		if (/*maxBet*/ ctx[9] === undefined && !("maxBet" in props)) {
    			console_1.warn("<App> was created without expected prop 'maxBet'");
    		}

    		if (/*allIn*/ ctx[20] === undefined && !("allIn" in props)) {
    			console_1.warn("<App> was created without expected prop 'allIn'");
    		}
    	}

    	get game() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set game(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get playerName() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set playerName(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get pokerBotHandWidth() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pokerBotHandWidth(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get heroHandWidth() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set heroHandWidth(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get pot() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pot(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get heroActiveClass() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set heroActiveClass(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get villain() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set villain(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get hero() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set hero(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get community() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set community(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get betSize() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set betSize(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get maxBet() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set maxBet(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get allIn() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set allIn(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get messageObj() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set messageObj(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    var app = new App({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
