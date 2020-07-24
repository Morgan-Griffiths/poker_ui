
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
    function children(element) {
        return Array.from(element.childNodes);
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
    			add_location(div, file, 53, 2, 1221);
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
    					currPlayer: null,
    					othPlayer: false,
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
    	child_ctx[45] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[45] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[50] = list[i];
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[53] = list[i];
    	return child_ctx;
    }

    function get_each_context_4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[53] = list[i];
    	return child_ctx;
    }

    function get_each_context_6(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[53] = list[i];
    	return child_ctx;
    }

    function get_each_context_5(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[58] = list[i];
    	return child_ctx;
    }

    function get_each_context_7(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[63] = list[i];
    	return child_ctx;
    }

    // (286:2) {:else}
    function create_else_block(ctx) {
    	let div1;
    	let h20;
    	let t1;
    	let hr0;
    	let t2;
    	let div0;
    	let t3;
    	let div2;
    	let h21;
    	let t5;
    	let hr1;
    	let t6;
    	let table;
    	let tr0;
    	let td0;
    	let t8;
    	let td1;
    	let t9_value = /*playerStats*/ ctx[18].bb_per_hand.toFixed(2) + "";
    	let t9;
    	let t10;
    	let tr1;
    	let td2;
    	let t12;
    	let td3;
    	let t13_value = /*playerStats*/ ctx[18].results + "";
    	let t13;
    	let t14;
    	let tr2;
    	let td4;
    	let t16;
    	let td5;
    	let t17_value = /*playerStats*/ ctx[18].total_hands + "";
    	let t17;
    	let t18;
    	let div4;
    	let div3;
    	let t19;
    	let div8;
    	let div6;
    	let div5;
    	let t20;
    	let t21;
    	let hr2;
    	let t22;
    	let p0;
    	let t23;
    	let t24_value = /*villain*/ ctx[9].stack + "";
    	let t24;
    	let t25;
    	let div7;
    	let span0;
    	let t26;
    	let t27_value = /*villain*/ ctx[9].streetTotal + "";
    	let t27;
    	let div7_class_value;
    	let t28;
    	let div11;
    	let div9;
    	let img;
    	let img_src_value;
    	let t29;
    	let span1;
    	let t30;
    	let t31;
    	let t32;
    	let div10;
    	let t33;
    	let t34;
    	let div14;
    	let div12;
    	let span2;
    	let t35;
    	let t36_value = /*hero*/ ctx[10].streetTotal + "";
    	let t36;
    	let div12_class_value;
    	let t37;
    	let div13;
    	let t38;
    	let div15;
    	let div15_class_value;
    	let t39;
    	let div20;
    	let div16;
    	let div16_class_value;
    	let t40;
    	let div18;
    	let div17;
    	let t41;
    	let t42;
    	let t43;
    	let hr3;
    	let t44;
    	let p1;
    	let t45;
    	let t46_value = /*hero*/ ctx[10].stack + "";
    	let t46;
    	let t47;
    	let div19;
    	let div19_class_value;
    	let current;
    	let each_value_7 = /*gameHistory*/ ctx[14];
    	validate_each_argument(each_value_7);
    	let each_blocks_3 = [];

    	for (let i = 0; i < each_value_7.length; i += 1) {
    		each_blocks_3[i] = create_each_block_7(get_each_context_7(ctx, each_value_7, i));
    	}

    	function select_block_type_1(ctx, dirty) {
    		if (/*villain*/ ctx[9].hand.length === 0) return create_if_block_8;
    		return create_else_block_1;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block0 = current_block_type(ctx);
    	let if_block1 = /*villain*/ ctx[9].dealer && create_if_block_7(ctx);

    	const actiondialog = new ActionDialog({
    			props: { messageObj: /*messageObj*/ ctx[15] },
    			$$inline: true
    		});

    	let each_value_4 = /*community*/ ctx[11];
    	validate_each_argument(each_value_4);
    	let each_blocks_2 = [];

    	for (let i = 0; i < each_value_4.length; i += 1) {
    		each_blocks_2[i] = create_each_block_4(get_each_context_4(ctx, each_value_4, i));
    	}

    	let each_value_3 = /*hero*/ ctx[10].hand;
    	validate_each_argument(each_value_3);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks_1[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
    	}

    	let each_value_2 = /*availBetsizes*/ ctx[13];
    	validate_each_argument(each_value_2);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	let if_block2 = /*availActions*/ ctx[2] && create_if_block_5(ctx);
    	let if_block3 = /*hero*/ ctx[10].dealer && create_if_block_4(ctx);
    	let if_block4 = /*availActions*/ ctx[2] && create_if_block_2(ctx);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			h20 = element("h2");
    			h20.textContent = "History";
    			t1 = space();
    			hr0 = element("hr");
    			t2 = space();
    			div0 = element("div");

    			for (let i = 0; i < each_blocks_3.length; i += 1) {
    				each_blocks_3[i].c();
    			}

    			t3 = space();
    			div2 = element("div");
    			h21 = element("h2");
    			h21.textContent = "Stats";
    			t5 = space();
    			hr1 = element("hr");
    			t6 = space();
    			table = element("table");
    			tr0 = element("tr");
    			td0 = element("td");
    			td0.textContent = "bb per hand";
    			t8 = space();
    			td1 = element("td");
    			t9 = text(t9_value);
    			t10 = space();
    			tr1 = element("tr");
    			td2 = element("td");
    			td2.textContent = "results";
    			t12 = space();
    			td3 = element("td");
    			t13 = text(t13_value);
    			t14 = space();
    			tr2 = element("tr");
    			td4 = element("td");
    			td4.textContent = "total_hands";
    			t16 = space();
    			td5 = element("td");
    			t17 = text(t17_value);
    			t18 = space();
    			div4 = element("div");
    			div3 = element("div");
    			if_block0.c();
    			t19 = space();
    			div8 = element("div");
    			div6 = element("div");
    			div5 = element("div");
    			t20 = text("Morgan's Poker Bot\n          ");
    			if (if_block1) if_block1.c();
    			t21 = space();
    			hr2 = element("hr");
    			t22 = space();
    			p0 = element("p");
    			t23 = text("$");
    			t24 = text(t24_value);
    			t25 = space();
    			div7 = element("div");
    			span0 = element("span");
    			t26 = text("$");
    			t27 = text(t27_value);
    			t28 = space();
    			div11 = element("div");
    			div9 = element("div");
    			img = element("img");
    			t29 = space();
    			span1 = element("span");
    			t30 = text("$");
    			t31 = text(/*pot*/ ctx[7]);
    			t32 = space();
    			div10 = element("div");
    			create_component(actiondialog.$$.fragment);
    			t33 = space();

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].c();
    			}

    			t34 = space();
    			div14 = element("div");
    			div12 = element("div");
    			span2 = element("span");
    			t35 = text("$");
    			t36 = text(t36_value);
    			t37 = space();
    			div13 = element("div");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t38 = space();
    			div15 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t39 = space();
    			div20 = element("div");
    			div16 = element("div");
    			if (if_block2) if_block2.c();
    			t40 = space();
    			div18 = element("div");
    			div17 = element("div");
    			t41 = text(/*playerName*/ ctx[1]);
    			t42 = space();
    			if (if_block3) if_block3.c();
    			t43 = space();
    			hr3 = element("hr");
    			t44 = space();
    			p1 = element("p");
    			t45 = text("$");
    			t46 = text(t46_value);
    			t47 = space();
    			div19 = element("div");
    			if (if_block4) if_block4.c();
    			add_location(h20, file$1, 287, 6, 8473);
    			add_location(hr0, file$1, 288, 6, 8496);
    			attr_dev(div0, "id", "history-content");
    			add_location(div0, file$1, 289, 6, 8509);
    			attr_dev(div1, "id", "history");
    			add_location(div1, file$1, 286, 4, 8448);
    			add_location(h21, file$1, 296, 4, 8659);
    			add_location(hr1, file$1, 297, 4, 8678);
    			add_location(td0, file$1, 299, 12, 8728);
    			attr_dev(td1, "class", "text-right");
    			add_location(td1, file$1, 299, 33, 8749);
    			add_location(tr0, file$1, 299, 8, 8724);
    			add_location(td2, file$1, 300, 12, 8831);
    			attr_dev(td3, "class", "text-right");
    			add_location(td3, file$1, 300, 29, 8848);
    			add_location(tr1, file$1, 300, 8, 8827);
    			add_location(td4, file$1, 301, 12, 8915);
    			attr_dev(td5, "class", "text-right");
    			add_location(td5, file$1, 301, 33, 8936);
    			add_location(tr2, file$1, 301, 8, 8911);
    			attr_dev(table, "id", "stats-content");
    			add_location(table, file$1, 298, 6, 8689);
    			attr_dev(div2, "id", "stats");
    			add_location(div2, file$1, 295, 2, 8638);
    			attr_dev(div3, "id", "villian");
    			attr_dev(div3, "class", "hand");
    			set_style(div3, "width", /*pokerBotHandWidth*/ ctx[5] + "px");
    			add_location(div3, file$1, 305, 6, 9072);
    			attr_dev(div4, "class", "container no-margin-bottom");
    			add_location(div4, file$1, 304, 4, 9025);
    			attr_dev(div5, "class", "d-flex justify-center");
    			set_style(div5, "margin-bottom", "8px");
    			add_location(div5, file$1, 323, 8, 9728);
    			add_location(hr2, file$1, 329, 8, 9935);
    			add_location(p0, file$1, 330, 8, 9950);
    			attr_dev(div6, "id", "villian-info");
    			attr_dev(div6, "class", "d-flex column");
    			add_location(div6, file$1, 322, 6, 9674);
    			add_location(span0, file$1, 333, 8, 10049);
    			attr_dev(div7, "class", div7_class_value = "" + (/*activeDisplayClass*/ ctx[8] + " street-total"));
    			add_location(div7, file$1, 332, 6, 9993);
    			attr_dev(div8, "class", "container no-margin-bottom no-margin-top");
    			add_location(div8, file$1, 321, 4, 9613);
    			if (img.src !== (img_src_value = "images/poker-chip.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Poker Chip");
    			attr_dev(img, "height", "105%");
    			set_style(img, "margin-right", "10px");
    			add_location(img, file$1, 338, 8, 10183);
    			add_location(span1, file$1, 343, 8, 10324);
    			attr_dev(div9, "id", "pot");
    			attr_dev(div9, "class", /*potClass*/ ctx[17]);
    			add_location(div9, file$1, 337, 6, 10143);
    			attr_dev(div10, "id", "community");
    			attr_dev(div10, "class", "hand");
    			add_location(div10, file$1, 345, 6, 10363);
    			attr_dev(div11, "class", "container");
    			add_location(div11, file$1, 336, 4, 10113);
    			add_location(span2, file$1, 356, 8, 10733);
    			attr_dev(div12, "class", div12_class_value = "" + (/*activeDisplayClass*/ ctx[8] + " street-total"));
    			add_location(div12, file$1, 355, 6, 10677);
    			attr_dev(div13, "id", "hero");
    			attr_dev(div13, "class", "hand");
    			set_style(div13, "width", /*heroHandWidth*/ ctx[6] + "px");
    			add_location(div13, file$1, 358, 6, 10785);
    			attr_dev(div14, "class", "container no-margin-bottom");
    			add_location(div14, file$1, 354, 4, 10630);
    			attr_dev(div15, "id", "bet-options");
    			attr_dev(div15, "class", div15_class_value = "" + (/*activeDisplayClass*/ ctx[8] + " d-flex flex-wrap"));
    			add_location(div15, file$1, 366, 4, 11042);
    			attr_dev(div16, "class", div16_class_value = "left " + /*activeDisplayClass*/ ctx[8] + " actions d-flex align-center");
    			add_location(div16, file$1, 389, 6, 11809);
    			attr_dev(div17, "class", "d-flex justify-center");
    			set_style(div17, "margin-bottom", "8px");
    			add_location(div17, file$1, 404, 8, 12326);
    			add_location(hr3, file$1, 410, 8, 12524);
    			add_location(p1, file$1, 411, 8, 12539);
    			attr_dev(div18, "id", "hero-info");
    			attr_dev(div18, "class", "d-flex column");
    			add_location(div18, file$1, 403, 6, 12275);
    			attr_dev(div19, "class", div19_class_value = "right " + /*activeDisplayClass*/ ctx[8] + " actions d-flex align-center");
    			add_location(div19, file$1, 413, 6, 12579);
    			attr_dev(div20, "class", "container d-flex justify-center flex-wrap no-margin-top");
    			add_location(div20, file$1, 373, 4, 11296);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, h20);
    			append_dev(div1, t1);
    			append_dev(div1, hr0);
    			append_dev(div1, t2);
    			append_dev(div1, div0);

    			for (let i = 0; i < each_blocks_3.length; i += 1) {
    				each_blocks_3[i].m(div0, null);
    			}

    			insert_dev(target, t3, anchor);
    			insert_dev(target, div2, anchor);
    			append_dev(div2, h21);
    			append_dev(div2, t5);
    			append_dev(div2, hr1);
    			append_dev(div2, t6);
    			append_dev(div2, table);
    			append_dev(table, tr0);
    			append_dev(tr0, td0);
    			append_dev(tr0, t8);
    			append_dev(tr0, td1);
    			append_dev(td1, t9);
    			append_dev(table, t10);
    			append_dev(table, tr1);
    			append_dev(tr1, td2);
    			append_dev(tr1, t12);
    			append_dev(tr1, td3);
    			append_dev(td3, t13);
    			append_dev(table, t14);
    			append_dev(table, tr2);
    			append_dev(tr2, td4);
    			append_dev(tr2, t16);
    			append_dev(tr2, td5);
    			append_dev(td5, t17);
    			insert_dev(target, t18, anchor);
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div3);
    			if_block0.m(div3, null);
    			insert_dev(target, t19, anchor);
    			insert_dev(target, div8, anchor);
    			append_dev(div8, div6);
    			append_dev(div6, div5);
    			append_dev(div5, t20);
    			if (if_block1) if_block1.m(div5, null);
    			append_dev(div6, t21);
    			append_dev(div6, hr2);
    			append_dev(div6, t22);
    			append_dev(div6, p0);
    			append_dev(p0, t23);
    			append_dev(p0, t24);
    			append_dev(div8, t25);
    			append_dev(div8, div7);
    			append_dev(div7, span0);
    			append_dev(span0, t26);
    			append_dev(span0, t27);
    			insert_dev(target, t28, anchor);
    			insert_dev(target, div11, anchor);
    			append_dev(div11, div9);
    			append_dev(div9, img);
    			append_dev(div9, t29);
    			append_dev(div9, span1);
    			append_dev(span1, t30);
    			append_dev(span1, t31);
    			append_dev(div11, t32);
    			append_dev(div11, div10);
    			mount_component(actiondialog, div10, null);
    			append_dev(div10, t33);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].m(div10, null);
    			}

    			insert_dev(target, t34, anchor);
    			insert_dev(target, div14, anchor);
    			append_dev(div14, div12);
    			append_dev(div12, span2);
    			append_dev(span2, t35);
    			append_dev(span2, t36);
    			append_dev(div14, t37);
    			append_dev(div14, div13);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(div13, null);
    			}

    			insert_dev(target, t38, anchor);
    			insert_dev(target, div15, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div15, null);
    			}

    			insert_dev(target, t39, anchor);
    			insert_dev(target, div20, anchor);
    			append_dev(div20, div16);
    			if (if_block2) if_block2.m(div16, null);
    			append_dev(div20, t40);
    			append_dev(div20, div18);
    			append_dev(div18, div17);
    			append_dev(div17, t41);
    			append_dev(div17, t42);
    			if (if_block3) if_block3.m(div17, null);
    			append_dev(div18, t43);
    			append_dev(div18, hr3);
    			append_dev(div18, t44);
    			append_dev(div18, p1);
    			append_dev(p1, t45);
    			append_dev(p1, t46);
    			append_dev(div20, t47);
    			append_dev(div20, div19);
    			if (if_block4) if_block4.m(div19, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*gameHistory*/ 16384) {
    				each_value_7 = /*gameHistory*/ ctx[14];
    				validate_each_argument(each_value_7);
    				let i;

    				for (i = 0; i < each_value_7.length; i += 1) {
    					const child_ctx = get_each_context_7(ctx, each_value_7, i);

    					if (each_blocks_3[i]) {
    						each_blocks_3[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_3[i] = create_each_block_7(child_ctx);
    						each_blocks_3[i].c();
    						each_blocks_3[i].m(div0, null);
    					}
    				}

    				for (; i < each_blocks_3.length; i += 1) {
    					each_blocks_3[i].d(1);
    				}

    				each_blocks_3.length = each_value_7.length;
    			}

    			if ((!current || dirty[0] & /*playerStats*/ 262144) && t9_value !== (t9_value = /*playerStats*/ ctx[18].bb_per_hand.toFixed(2) + "")) set_data_dev(t9, t9_value);
    			if ((!current || dirty[0] & /*playerStats*/ 262144) && t13_value !== (t13_value = /*playerStats*/ ctx[18].results + "")) set_data_dev(t13, t13_value);
    			if ((!current || dirty[0] & /*playerStats*/ 262144) && t17_value !== (t17_value = /*playerStats*/ ctx[18].total_hands + "")) set_data_dev(t17, t17_value);

    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block0) {
    				if_block0.p(ctx, dirty);
    			} else {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(div3, null);
    				}
    			}

    			if (!current || dirty[0] & /*pokerBotHandWidth*/ 32) {
    				set_style(div3, "width", /*pokerBotHandWidth*/ ctx[5] + "px");
    			}

    			if (/*villain*/ ctx[9].dealer) {
    				if (if_block1) ; else {
    					if_block1 = create_if_block_7(ctx);
    					if_block1.c();
    					if_block1.m(div5, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if ((!current || dirty[0] & /*villain*/ 512) && t24_value !== (t24_value = /*villain*/ ctx[9].stack + "")) set_data_dev(t24, t24_value);
    			if ((!current || dirty[0] & /*villain*/ 512) && t27_value !== (t27_value = /*villain*/ ctx[9].streetTotal + "")) set_data_dev(t27, t27_value);

    			if (!current || dirty[0] & /*activeDisplayClass*/ 256 && div7_class_value !== (div7_class_value = "" + (/*activeDisplayClass*/ ctx[8] + " street-total"))) {
    				attr_dev(div7, "class", div7_class_value);
    			}

    			if (!current || dirty[0] & /*pot*/ 128) set_data_dev(t31, /*pot*/ ctx[7]);

    			if (!current || dirty[0] & /*potClass*/ 131072) {
    				attr_dev(div9, "class", /*potClass*/ ctx[17]);
    			}

    			const actiondialog_changes = {};
    			if (dirty[0] & /*messageObj*/ 32768) actiondialog_changes.messageObj = /*messageObj*/ ctx[15];
    			actiondialog.$set(actiondialog_changes);

    			if (dirty[0] & /*community*/ 2048) {
    				each_value_4 = /*community*/ ctx[11];
    				validate_each_argument(each_value_4);
    				let i;

    				for (i = 0; i < each_value_4.length; i += 1) {
    					const child_ctx = get_each_context_4(ctx, each_value_4, i);

    					if (each_blocks_2[i]) {
    						each_blocks_2[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_2[i] = create_each_block_4(child_ctx);
    						each_blocks_2[i].c();
    						each_blocks_2[i].m(div10, null);
    					}
    				}

    				for (; i < each_blocks_2.length; i += 1) {
    					each_blocks_2[i].d(1);
    				}

    				each_blocks_2.length = each_value_4.length;
    			}

    			if ((!current || dirty[0] & /*hero*/ 1024) && t36_value !== (t36_value = /*hero*/ ctx[10].streetTotal + "")) set_data_dev(t36, t36_value);

    			if (!current || dirty[0] & /*activeDisplayClass*/ 256 && div12_class_value !== (div12_class_value = "" + (/*activeDisplayClass*/ ctx[8] + " street-total"))) {
    				attr_dev(div12, "class", div12_class_value);
    			}

    			if (dirty[0] & /*hero*/ 1024) {
    				each_value_3 = /*hero*/ ctx[10].hand;
    				validate_each_argument(each_value_3);
    				let i;

    				for (i = 0; i < each_value_3.length; i += 1) {
    					const child_ctx = get_each_context_3(ctx, each_value_3, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_3(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(div13, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_3.length;
    			}

    			if (!current || dirty[0] & /*heroHandWidth*/ 64) {
    				set_style(div13, "width", /*heroHandWidth*/ ctx[6] + "px");
    			}

    			if (dirty[0] & /*setBetAmount, availBetsizes*/ 4202496) {
    				each_value_2 = /*availBetsizes*/ ctx[13];
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div15, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_2.length;
    			}

    			if (!current || dirty[0] & /*activeDisplayClass*/ 256 && div15_class_value !== (div15_class_value = "" + (/*activeDisplayClass*/ ctx[8] + " d-flex flex-wrap"))) {
    				attr_dev(div15, "class", div15_class_value);
    			}

    			if (/*availActions*/ ctx[2]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_5(ctx);
    					if_block2.c();
    					if_block2.m(div16, null);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (!current || dirty[0] & /*activeDisplayClass*/ 256 && div16_class_value !== (div16_class_value = "left " + /*activeDisplayClass*/ ctx[8] + " actions d-flex align-center")) {
    				attr_dev(div16, "class", div16_class_value);
    			}

    			if (!current || dirty[0] & /*playerName*/ 2) set_data_dev(t41, /*playerName*/ ctx[1]);

    			if (/*hero*/ ctx[10].dealer) {
    				if (if_block3) ; else {
    					if_block3 = create_if_block_4(ctx);
    					if_block3.c();
    					if_block3.m(div17, null);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}

    			if ((!current || dirty[0] & /*hero*/ 1024) && t46_value !== (t46_value = /*hero*/ ctx[10].stack + "")) set_data_dev(t46, t46_value);

    			if (/*availActions*/ ctx[2]) {
    				if (if_block4) {
    					if_block4.p(ctx, dirty);
    				} else {
    					if_block4 = create_if_block_2(ctx);
    					if_block4.c();
    					if_block4.m(div19, null);
    				}
    			} else if (if_block4) {
    				if_block4.d(1);
    				if_block4 = null;
    			}

    			if (!current || dirty[0] & /*activeDisplayClass*/ 256 && div19_class_value !== (div19_class_value = "right " + /*activeDisplayClass*/ ctx[8] + " actions d-flex align-center")) {
    				attr_dev(div19, "class", div19_class_value);
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
    			destroy_each(each_blocks_3, detaching);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(div2);
    			if (detaching) detach_dev(t18);
    			if (detaching) detach_dev(div4);
    			if_block0.d();
    			if (detaching) detach_dev(t19);
    			if (detaching) detach_dev(div8);
    			if (if_block1) if_block1.d();
    			if (detaching) detach_dev(t28);
    			if (detaching) detach_dev(div11);
    			destroy_component(actiondialog);
    			destroy_each(each_blocks_2, detaching);
    			if (detaching) detach_dev(t34);
    			if (detaching) detach_dev(div14);
    			destroy_each(each_blocks_1, detaching);
    			if (detaching) detach_dev(t38);
    			if (detaching) detach_dev(div15);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t39);
    			if (detaching) detach_dev(div20);
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    			if (if_block4) if_block4.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(286:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (277:32) 
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
    			add_location(h1, file$1, 278, 6, 8251);
    			attr_dev(div0, "class", "btn hover-effect");
    			add_location(div0, file$1, 281, 10, 8355);
    			add_location(li, file$1, 280, 8, 8306);
    			attr_dev(ul, "id", "game-menu");
    			add_location(ul, file$1, 279, 6, 8278);
    			attr_dev(div1, "class", "container text-center");
    			add_location(div1, file$1, 277, 4, 8209);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, h1);
    			append_dev(div1, t1);
    			append_dev(div1, ul);
    			append_dev(ul, li);
    			append_dev(li, div0);
    			if (remount) dispose();
    			dispose = listen_dev(li, "click", /*click_handler*/ ctx[41], false, false, false);
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
    		source: "(277:32) ",
    		ctx
    	});

    	return block;
    }

    // (267:2) {#if !game && !playerName}
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
    			add_location(h1, file$1, 268, 6, 7937);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "id", "hero-name");
    			add_location(input, file$1, 270, 8, 7998);
    			attr_dev(div0, "id", "name-field");
    			add_location(div0, file$1, 269, 6, 7968);
    			attr_dev(div1, "class", "btn hover-effect");
    			add_location(div1, file$1, 273, 8, 8088);
    			attr_dev(div2, "class", "btn-wrapper");
    			add_location(div2, file$1, 272, 6, 8054);
    			attr_dev(div3, "class", "container text-center");
    			add_location(div3, file$1, 267, 4, 7895);
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
    			dispose = listen_dev(div1, "click", /*setName*/ ctx[19], false, false, false);
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
    		source: "(267:2) {#if !game && !playerName}",
    		ctx
    	});

    	return block;
    }

    // (291:8) {#each gameHistory as step}
    function create_each_block_7(ctx) {
    	let div;
    	let t_value = /*step*/ ctx[63] + "";
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(t_value);
    			add_location(div, file$1, 291, 10, 8582);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*gameHistory*/ 16384 && t_value !== (t_value = /*step*/ ctx[63] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_7.name,
    		type: "each",
    		source: "(291:8) {#each gameHistory as step}",
    		ctx
    	});

    	return block;
    }

    // (313:8) {:else}
    function create_else_block_1(ctx) {
    	let each_1_anchor;
    	let each_value_6 = /*villain*/ ctx[9].hand;
    	validate_each_argument(each_value_6);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_6.length; i += 1) {
    		each_blocks[i] = create_each_block_6(get_each_context_6(ctx, each_value_6, i));
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
    			if (dirty[0] & /*villain*/ 512) {
    				each_value_6 = /*villain*/ ctx[9].hand;
    				validate_each_argument(each_value_6);
    				let i;

    				for (i = 0; i < each_value_6.length; i += 1) {
    					const child_ctx = get_each_context_6(ctx, each_value_6, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_6(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_6.length;
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
    		source: "(313:8) {:else}",
    		ctx
    	});

    	return block;
    }

    // (307:8) {#if villain.hand.length === 0}
    function create_if_block_8(ctx) {
    	let each_1_anchor;
    	let each_value_5 = Array(/*playerNumCards*/ ctx[16]);
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
    			if (dirty[0] & /*playerNumCards*/ 65536) {
    				const old_length = each_value_5.length;
    				each_value_5 = Array(/*playerNumCards*/ ctx[16]);
    				validate_each_argument(each_value_5);
    				let i;

    				for (i = old_length; i < each_value_5.length; i += 1) {
    					const child_ctx = get_each_context_5(ctx, each_value_5, i);

    					if (!each_blocks[i]) {
    						each_blocks[i] = create_each_block_5(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (i = each_value_5.length; i < old_length; i += 1) {
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
    		id: create_if_block_8.name,
    		type: "if",
    		source: "(307:8) {#if villain.hand.length === 0}",
    		ctx
    	});

    	return block;
    }

    // (314:10) {#each villain.hand as card}
    function create_each_block_6(ctx) {
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
    			if (img.src !== (img_src_value = "images/cards/" + /*card*/ ctx[53] + ".png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", img_alt_value = /*card*/ ctx[53]);
    			add_location(img, file$1, 315, 14, 9485);
    			attr_dev(div, "class", "card-container");
    			add_location(div, file$1, 314, 12, 9442);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, img);
    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*villain*/ 512 && img.src !== (img_src_value = "images/cards/" + /*card*/ ctx[53] + ".png")) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty[0] & /*villain*/ 512 && img_alt_value !== (img_alt_value = /*card*/ ctx[53])) {
    				attr_dev(img, "alt", img_alt_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_6.name,
    		type: "each",
    		source: "(314:10) {#each villain.hand as card}",
    		ctx
    	});

    	return block;
    }

    // (308:10) {#each Array(playerNumCards) as _}
    function create_each_block_5(ctx) {
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
    			add_location(img, file$1, 309, 14, 9281);
    			attr_dev(div, "class", "card-container");
    			add_location(div, file$1, 308, 12, 9238);
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
    		id: create_each_block_5.name,
    		type: "each",
    		source: "(308:10) {#each Array(playerNumCards) as _}",
    		ctx
    	});

    	return block;
    }

    // (326:10) {#if villain.dealer}
    function create_if_block_7(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "D";
    			attr_dev(div, "class", "dealer-chip");
    			add_location(div, file$1, 326, 12, 9863);
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
    		source: "(326:10) {#if villain.dealer}",
    		ctx
    	});

    	return block;
    }

    // (348:8) {#each community as card}
    function create_each_block_4(ctx) {
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
    			if (img.src !== (img_src_value = "images/cards/" + /*card*/ ctx[53] + ".png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", img_alt_value = /*card*/ ctx[53]);
    			add_location(img, file$1, 349, 12, 10520);
    			attr_dev(div, "class", "card-container");
    			add_location(div, file$1, 348, 10, 10479);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, img);
    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*community*/ 2048 && img.src !== (img_src_value = "images/cards/" + /*card*/ ctx[53] + ".png")) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty[0] & /*community*/ 2048 && img_alt_value !== (img_alt_value = /*card*/ ctx[53])) {
    				attr_dev(img, "alt", img_alt_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_4.name,
    		type: "each",
    		source: "(348:8) {#each community as card}",
    		ctx
    	});

    	return block;
    }

    // (360:8) {#each hero.hand as card}
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
    			if (img.src !== (img_src_value = "images/cards/" + /*card*/ ctx[53] + ".png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", img_alt_value = /*card*/ ctx[53]);
    			add_location(img, file$1, 361, 12, 10932);
    			attr_dev(div, "class", "card-container");
    			add_location(div, file$1, 360, 10, 10891);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, img);
    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*hero*/ 1024 && img.src !== (img_src_value = "images/cards/" + /*card*/ ctx[53] + ".png")) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty[0] & /*hero*/ 1024 && img_alt_value !== (img_alt_value = /*card*/ ctx[53])) {
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
    		source: "(360:8) {#each hero.hand as card}",
    		ctx
    	});

    	return block;
    }

    // (368:6) {#each availBetsizes as availBet}
    function create_each_block_2(ctx) {
    	let div;
    	let t0;
    	let t1_value = /*availBet*/ ctx[50] + "";
    	let t1;
    	let t2;
    	let dispose;

    	function click_handler_1(...args) {
    		return /*click_handler_1*/ ctx[42](/*availBet*/ ctx[50], ...args);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text("$");
    			t1 = text(t1_value);
    			t2 = space();
    			attr_dev(div, "class", "btn hover-effect");
    			add_location(div, file$1, 368, 8, 11159);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);
    			append_dev(div, t2);
    			if (remount) dispose();
    			dispose = listen_dev(div, "click", click_handler_1, false, false, false);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*availBetsizes*/ 8192 && t1_value !== (t1_value = /*availBet*/ ctx[50] + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(368:6) {#each availBetsizes as availBet}",
    		ctx
    	});

    	return block;
    }

    // (391:8) {#if availActions}
    function create_if_block_5(ctx) {
    	let each_1_anchor;
    	let each_value_1 = /*leftAvailActions*/ ctx[3];
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
    			if (dirty[0] & /*endTurn, leftAvailActions, betSize*/ 2101256) {
    				each_value_1 = /*leftAvailActions*/ ctx[3];
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
    		source: "(391:8) {#if availActions}",
    		ctx
    	});

    	return block;
    }

    // (398:16) {#if action === 'Bet' || action === 'Raise'}
    function create_if_block_6(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text(/*betSize*/ ctx[12]);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*betSize*/ 4096) set_data_dev(t, /*betSize*/ ctx[12]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(398:16) {#if action === 'Bet' || action === 'Raise'}",
    		ctx
    	});

    	return block;
    }

    // (392:10) {#each leftAvailActions as action}
    function create_each_block_1(ctx) {
    	let div;
    	let span;
    	let t0_value = /*action*/ ctx[45] + "";
    	let t0;
    	let t1;
    	let t2;
    	let dispose;
    	let if_block = (/*action*/ ctx[45] === "Bet" || /*action*/ ctx[45] === "Raise") && create_if_block_6(ctx);

    	function click_handler_2(...args) {
    		return /*click_handler_2*/ ctx[43](/*action*/ ctx[45], ...args);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			span = element("span");
    			t0 = text(t0_value);
    			t1 = space();
    			if (if_block) if_block.c();
    			t2 = space();
    			add_location(span, file$1, 395, 14, 12076);
    			attr_dev(div, "class", "btn hover-effect");
    			add_location(div, file$1, 392, 12, 11961);
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
    			if (dirty[0] & /*leftAvailActions*/ 8 && t0_value !== (t0_value = /*action*/ ctx[45] + "")) set_data_dev(t0, t0_value);

    			if (/*action*/ ctx[45] === "Bet" || /*action*/ ctx[45] === "Raise") {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_6(ctx);
    					if_block.c();
    					if_block.m(span, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
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
    		source: "(392:10) {#each leftAvailActions as action}",
    		ctx
    	});

    	return block;
    }

    // (407:10) {#if hero.dealer}
    function create_if_block_4(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "D";
    			attr_dev(div, "class", "dealer-chip");
    			add_location(div, file$1, 407, 12, 12452);
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
    		source: "(407:10) {#if hero.dealer}",
    		ctx
    	});

    	return block;
    }

    // (415:8) {#if availActions}
    function create_if_block_2(ctx) {
    	let each_1_anchor;
    	let each_value = /*rightAvailActions*/ ctx[4];
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
    			if (dirty[0] & /*endTurn, rightAvailActions, betSize*/ 2101264) {
    				each_value = /*rightAvailActions*/ ctx[4];
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
    		source: "(415:8) {#if availActions}",
    		ctx
    	});

    	return block;
    }

    // (422:16) {#if action === 'Bet' || action === 'Raise'}
    function create_if_block_3(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text(/*betSize*/ ctx[12]);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*betSize*/ 4096) set_data_dev(t, /*betSize*/ ctx[12]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(422:16) {#if action === 'Bet' || action === 'Raise'}",
    		ctx
    	});

    	return block;
    }

    // (416:10) {#each rightAvailActions as action}
    function create_each_block(ctx) {
    	let div;
    	let span;
    	let t0_value = /*action*/ ctx[45] + "";
    	let t0;
    	let t1;
    	let t2;
    	let dispose;
    	let if_block = (/*action*/ ctx[45] === "Bet" || /*action*/ ctx[45] === "Raise") && create_if_block_3(ctx);

    	function click_handler_3(...args) {
    		return /*click_handler_3*/ ctx[44](/*action*/ ctx[45], ...args);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			span = element("span");
    			t0 = text(t0_value);
    			t1 = space();
    			if (if_block) if_block.c();
    			t2 = space();
    			add_location(span, file$1, 419, 14, 12848);
    			attr_dev(div, "class", "btn hover-effect");
    			add_location(div, file$1, 416, 12, 12733);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span);
    			append_dev(span, t0);
    			append_dev(span, t1);
    			if (if_block) if_block.m(span, null);
    			append_dev(div, t2);
    			if (remount) dispose();
    			dispose = listen_dev(div, "click", click_handler_3, false, false, false);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*rightAvailActions*/ 16 && t0_value !== (t0_value = /*action*/ ctx[45] + "")) set_data_dev(t0, t0_value);

    			if (/*action*/ ctx[45] === "Bet" || /*action*/ ctx[45] === "Raise") {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_3(ctx);
    					if_block.c();
    					if_block.m(span, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
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
    		source: "(416:10) {#each rightAvailActions as action}",
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
    			add_location(div, file$1, 265, 0, 7845);
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
    	let { availActions = [] } = $$props;
    	let { leftAvailActions } = $$props, { rightAvailActions } = $$props;
    	let { pokerBotHandWidth } = $$props;
    	let { heroHandWidth } = $$props;
    	let { pot = 0 } = $$props;
    	let potClass;
    	let heroTurn;
    	let { activeDisplayClass = "inactive" } = $$props;

    	let { villain = {
    		hand: [],
    		stack: 1000,
    		dealer: true,
    		position: null,
    		streetTotal: 0
    	} } = $$props;

    	let { hero = {
    		hand: [],
    		stack: 1000,
    		dealer: false,
    		position: null,
    		streetTotal: 0
    	} } = $$props;

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

    	let gameType;
    	let gameState;

    	let playerStats = {
    		"results": 0,
    		"bb_per_hand": 0,
    		"total_hands": 0
    	};

    	let street;
    	let { availBetsizes = [] } = $$props;
    	let { gameHistory = [] } = $$props;

    	let actionDict = {
    		0: "check",
    		1: "fold",
    		2: "call",
    		3: "bet",
    		4: "raise",
    		5: "unopened"
    	};

    	let positionDict = { 0: "SB", 1: "BB", 2: "dealer" };
    	let streetStart = { 0: "SB", 1: "BB", 2: "BB", 3: "BB" };

    	function getAvailBetsizes(betsize_mask, betsizes) {
    		// This is useful for only allowing categorical betsizes, as opposed to continuous.
    		// Takes boolean mask array, and betsizes array of nums between 0 and 1.
    		// Returns new array of allowable betsizes.
    		console.log("betsize_mask,betsizes", betsize_mask, betsizes);

    		$$invalidate(13, availBetsizes = new Array(betsize_mask.length));

    		for (var i = 0; i < betsize_mask.length; i++) {
    			console.log(pot);
    			$$invalidate(13, availBetsizes[i] = betsize_mask[i] * betsizes[i] * pot, availBetsizes);
    		}

    		console.log("availBetsizes", availBetsizes);
    		return availBetsizes;
    	}

    	function updatePlayers(state) {
    		console.log("updatePlayers", state);
    		$$invalidate(10, hero.stack = state.hero_stack, hero);
    		$$invalidate(10, hero.dealer = state.hero_position == 0 ? true : false, hero);
    		$$invalidate(10, hero.position = state.hero_position, hero);

    		$$invalidate(
    			10,
    			hero.streetTotal = state.hero_position == state.player1_position
    			? state.player1_street_total
    			: state.player2_street_total,
    			hero
    		);

    		$$invalidate(
    			9,
    			villain.position = state.hero_position == state.player1_position
    			? state.player2_position
    			: state.player1_position,
    			villain
    		);

    		$$invalidate(
    			9,
    			villain.stack = villain.position == state.player1_position
    			? state.player1_stack
    			: state.player2_stack,
    			villain
    		);

    		$$invalidate(9, villain.dealer = state.villain_position == 0 ? true : false, villain);

    		$$invalidate(
    			9,
    			villain.streetTotal = state.villain_position == state.player1_position
    			? state.player1_street_total
    			: state.player2_street_total,
    			villain
    		);
    	}

    	function updateGame(state) {
    		street = state.street;
    		$$invalidate(7, pot = state.pot);
    	}

    	async function setName() {
    		let value = document.getElementById("hero-name").value;
    		$$invalidate(1, playerName = value);

    		const res = await fetch("http://localhost:4000/api/player/name", {
    			method: "POST",
    			body: JSON.stringify({ name: playerName })
    		});
    	}

    	async function getStats() {
    		const res = await fetch("http://localhost:4000/api/player/stats");
    		let text = await res.text();
    		$$invalidate(18, playerStats = JSON.parse(text));
    		console.log("playerStats", playerStats);
    	}

    	async function setGame(name) {
    		$$invalidate(0, game = name);
    		gameType = name;
    		newHand();
    	}

    	async function newHand() {
    		$$invalidate(9, villain.hand = [], villain);
    		const res = await fetch("http://localhost:4000/api/reset");
    		let text = await res.text();
    		gameState = JSON.parse(text);
    		const { state } = gameState;
    		console.log(state);
    		$$invalidate(16, playerNumCards = state.hero_cards.length / 2);
    		$$invalidate(2, availActions = getAvailActions(state.action_mask));
    		$$invalidate(10, hero.hand = await getCards(state.hero_cards), hero);
    		$$invalidate(11, community = await getCards(state.board_cards));
    		updatePlayers(state);
    		updateGame(state);
    		$$invalidate(13, availBetsizes = getAvailBetsizes(state.betsize_mask, state.betsizes));
    		decodeHistory(state);
    		$$invalidate(17, potClass = "active");
    		$$invalidate(8, activeDisplayClass = "active");
    		await getStats();
    	}

    	function buildString(
    		last_position,
    	last_action,
    	last_betsize,
    	amount_to_call,
    	last_street_total,
    	street
    	) {
    		let displayString;

    		if (last_position === "dealer") {
    			displayString = `${streetStart[street]} is first to act`;
    		} else if (last_action === "call") {
    			displayString = `${last_position} calls ${amount_to_call}`;
    		} else if (last_action === "fold") {
    			displayString = `${last_position} folds`;
    		} else if (last_action === "check") {
    			displayString = `${last_position} checks`;
    		} else if (last_action === "bet") {
    			displayString = `${last_position} bets ${last_betsize}`;
    		} else if (last_action === "raise") {
    			displayString = `${last_position} raises to ${last_betsize + Math.max(last_street_total - last_betsize, 0)}`;
    		}

    		return displayString;
    	}

    	function decodeHistory(gameData) {
    		$$invalidate(14, gameHistory = []);
    		const { history, mapping } = gameData;

    		// console.log(mapping)
    		const hist = history[0];

    		for (var i = 0; i < hist.length; i++) {
    			let amount_to_call;

    			if (i > 0) {
    				amount_to_call = hist[i - 1][mapping.amount_to_call];
    			} else {
    				amount_to_call = hist[i][mapping.amount_to_call];
    			}

    			let last_street_total = hist[i][mapping.last_position] == hist[i][mapping.player1_position]
    			? hist[i][mapping.player1_street_total]
    			: hist[i][mapping.player2_street_total];

    			let displayString = buildString(positionDict[hist[i][mapping.last_position]], actionDict[hist[i][mapping.last_action]], hist[i][mapping.last_aggressive_betsize], amount_to_call, last_street_total, hist[i][mapping.street]);
    			gameHistory.push(displayString);
    		}

    		console.log(gameHistory);
    	}

    	async function endTurn(action, betSize) {
    		action = action.slice(0, 1).toLowerCase() + action.slice(1);
    		$$invalidate(8, activeDisplayClass = "inactive");

    		if (action === "call") {
    			betSize = gameState.state.last_betsize;
    		}

    		console.log(JSON.stringify({ action, betsize: betSize }));

    		const res = await fetch("http://localhost:4000/api/step", {
    			method: "POST",
    			body: JSON.stringify({ action, betsize: betSize })
    		});

    		let text = await res.text();
    		let data = JSON.parse(text);
    		console.log("data", data);
    		const { state, outcome } = data;
    		decodeHistory(state);
    		$$invalidate(11, community = await getCards(state.board_cards));
    		updatePlayers(state);
    		updateGame(state);
    		$$invalidate(2, availActions = getAvailActions(state.action_mask));
    		$$invalidate(13, availBetsizes = getAvailBetsizes(state.betsize_mask, state.betsizes));
    		$$invalidate(8, activeDisplayClass = "active");

    		if (state.done) {
    			villain.dealer
    			? $$invalidate(9, villain.hand = await getCards(outcome.player1_hand), villain)
    			: $$invalidate(9, villain.hand = await getCards(outcome.player2_hand), villain);

    			//  activeDisplayClass = "inactive";
    			await getStats();

    			setTimeout(newHand, 10000);
    		}

    		console.log(villain.hand);
    	}

    	function setBetAmount(amount) {
    		$$invalidate(12, betSize = amount);
    	}

    	function checkAllIn() {
    		if (betSize === hero.stack) {
    			$$invalidate(24, allIn = true);
    		} else {
    			$$invalidate(24, allIn = false);
    		}
    	}

    	const writable_props = [
    		"game",
    		"playerName",
    		"availActions",
    		"leftAvailActions",
    		"rightAvailActions",
    		"pokerBotHandWidth",
    		"heroHandWidth",
    		"pot",
    		"activeDisplayClass",
    		"villain",
    		"hero",
    		"community",
    		"betSize",
    		"maxBet",
    		"allIn",
    		"messageObj",
    		"availBetsizes",
    		"gameHistory"
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);
    	const click_handler = () => setGame("omaha");
    	const click_handler_1 = availBet => setBetAmount(availBet);
    	const click_handler_2 = action => endTurn(action, betSize);
    	const click_handler_3 = action => endTurn(action, betSize);

    	$$self.$set = $$props => {
    		if ("game" in $$props) $$invalidate(0, game = $$props.game);
    		if ("playerName" in $$props) $$invalidate(1, playerName = $$props.playerName);
    		if ("availActions" in $$props) $$invalidate(2, availActions = $$props.availActions);
    		if ("leftAvailActions" in $$props) $$invalidate(3, leftAvailActions = $$props.leftAvailActions);
    		if ("rightAvailActions" in $$props) $$invalidate(4, rightAvailActions = $$props.rightAvailActions);
    		if ("pokerBotHandWidth" in $$props) $$invalidate(5, pokerBotHandWidth = $$props.pokerBotHandWidth);
    		if ("heroHandWidth" in $$props) $$invalidate(6, heroHandWidth = $$props.heroHandWidth);
    		if ("pot" in $$props) $$invalidate(7, pot = $$props.pot);
    		if ("activeDisplayClass" in $$props) $$invalidate(8, activeDisplayClass = $$props.activeDisplayClass);
    		if ("villain" in $$props) $$invalidate(9, villain = $$props.villain);
    		if ("hero" in $$props) $$invalidate(10, hero = $$props.hero);
    		if ("community" in $$props) $$invalidate(11, community = $$props.community);
    		if ("betSize" in $$props) $$invalidate(12, betSize = $$props.betSize);
    		if ("maxBet" in $$props) $$invalidate(23, maxBet = $$props.maxBet);
    		if ("allIn" in $$props) $$invalidate(24, allIn = $$props.allIn);
    		if ("messageObj" in $$props) $$invalidate(15, messageObj = $$props.messageObj);
    		if ("availBetsizes" in $$props) $$invalidate(13, availBetsizes = $$props.availBetsizes);
    		if ("gameHistory" in $$props) $$invalidate(14, gameHistory = $$props.gameHistory);
    	};

    	$$self.$capture_state = () => ({
    		getCards,
    		actions,
    		getAvailActions,
    		ActionDialog,
    		game,
    		playerName,
    		playerNumCards,
    		availActions,
    		leftAvailActions,
    		rightAvailActions,
    		pokerBotHandWidth,
    		heroHandWidth,
    		pot,
    		potClass,
    		heroTurn,
    		activeDisplayClass,
    		villain,
    		hero,
    		community,
    		betSize,
    		maxBet,
    		allIn,
    		showdown,
    		messageObj,
    		gameType,
    		gameState,
    		playerStats,
    		street,
    		availBetsizes,
    		gameHistory,
    		actionDict,
    		positionDict,
    		streetStart,
    		getAvailBetsizes,
    		updatePlayers,
    		updateGame,
    		setName,
    		getStats,
    		setGame,
    		newHand,
    		buildString,
    		decodeHistory,
    		endTurn,
    		setBetAmount,
    		checkAllIn
    	});

    	$$self.$inject_state = $$props => {
    		if ("game" in $$props) $$invalidate(0, game = $$props.game);
    		if ("playerName" in $$props) $$invalidate(1, playerName = $$props.playerName);
    		if ("playerNumCards" in $$props) $$invalidate(16, playerNumCards = $$props.playerNumCards);
    		if ("availActions" in $$props) $$invalidate(2, availActions = $$props.availActions);
    		if ("leftAvailActions" in $$props) $$invalidate(3, leftAvailActions = $$props.leftAvailActions);
    		if ("rightAvailActions" in $$props) $$invalidate(4, rightAvailActions = $$props.rightAvailActions);
    		if ("pokerBotHandWidth" in $$props) $$invalidate(5, pokerBotHandWidth = $$props.pokerBotHandWidth);
    		if ("heroHandWidth" in $$props) $$invalidate(6, heroHandWidth = $$props.heroHandWidth);
    		if ("pot" in $$props) $$invalidate(7, pot = $$props.pot);
    		if ("potClass" in $$props) $$invalidate(17, potClass = $$props.potClass);
    		if ("heroTurn" in $$props) heroTurn = $$props.heroTurn;
    		if ("activeDisplayClass" in $$props) $$invalidate(8, activeDisplayClass = $$props.activeDisplayClass);
    		if ("villain" in $$props) $$invalidate(9, villain = $$props.villain);
    		if ("hero" in $$props) $$invalidate(10, hero = $$props.hero);
    		if ("community" in $$props) $$invalidate(11, community = $$props.community);
    		if ("betSize" in $$props) $$invalidate(12, betSize = $$props.betSize);
    		if ("maxBet" in $$props) $$invalidate(23, maxBet = $$props.maxBet);
    		if ("allIn" in $$props) $$invalidate(24, allIn = $$props.allIn);
    		if ("showdown" in $$props) showdown = $$props.showdown;
    		if ("messageObj" in $$props) $$invalidate(15, messageObj = $$props.messageObj);
    		if ("gameType" in $$props) gameType = $$props.gameType;
    		if ("gameState" in $$props) gameState = $$props.gameState;
    		if ("playerStats" in $$props) $$invalidate(18, playerStats = $$props.playerStats);
    		if ("street" in $$props) street = $$props.street;
    		if ("availBetsizes" in $$props) $$invalidate(13, availBetsizes = $$props.availBetsizes);
    		if ("gameHistory" in $$props) $$invalidate(14, gameHistory = $$props.gameHistory);
    		if ("actionDict" in $$props) actionDict = $$props.actionDict;
    		if ("positionDict" in $$props) positionDict = $$props.positionDict;
    		if ("streetStart" in $$props) streetStart = $$props.streetStart;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*availActions*/ 4) {
    			 $$invalidate(3, leftAvailActions = availActions.length > 2
    			? availActions.slice(0, 2)
    			: availActions.slice(0, 1));
    		}

    		if ($$self.$$.dirty[0] & /*availActions*/ 4) {
    			 $$invalidate(4, rightAvailActions = availActions.length > 2
    			? availActions.slice(2)
    			: availActions.slice(1));
    		}

    		if ($$self.$$.dirty[0] & /*playerNumCards*/ 65536) {
    			 $$invalidate(5, pokerBotHandWidth = playerNumCards * 60 + 40);
    		}

    		if ($$self.$$.dirty[0] & /*playerNumCards*/ 65536) {
    			 $$invalidate(6, heroHandWidth = playerNumCards * 100 + 60);
    		}

    		if ($$self.$$.dirty[0] & /*hero*/ 1024) {
    			 $$invalidate(23, maxBet = hero.stack);
    		}

    		if ($$self.$$.dirty[0] & /*betSize, hero*/ 5120) {
    			 $$invalidate(24, allIn = betSize === hero.stack ? true : false);
    		}
    	};

    	return [
    		game,
    		playerName,
    		availActions,
    		leftAvailActions,
    		rightAvailActions,
    		pokerBotHandWidth,
    		heroHandWidth,
    		pot,
    		activeDisplayClass,
    		villain,
    		hero,
    		community,
    		betSize,
    		availBetsizes,
    		gameHistory,
    		messageObj,
    		playerNumCards,
    		potClass,
    		playerStats,
    		setName,
    		setGame,
    		endTurn,
    		setBetAmount,
    		maxBet,
    		allIn,
    		gameType,
    		gameState,
    		street,
    		heroTurn,
    		showdown,
    		actionDict,
    		positionDict,
    		streetStart,
    		getAvailBetsizes,
    		updatePlayers,
    		updateGame,
    		getStats,
    		newHand,
    		buildString,
    		decodeHistory,
    		checkAllIn,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3
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
    				availActions: 2,
    				leftAvailActions: 3,
    				rightAvailActions: 4,
    				pokerBotHandWidth: 5,
    				heroHandWidth: 6,
    				pot: 7,
    				activeDisplayClass: 8,
    				villain: 9,
    				hero: 10,
    				community: 11,
    				betSize: 12,
    				maxBet: 23,
    				allIn: 24,
    				messageObj: 15,
    				availBetsizes: 13,
    				gameHistory: 14
    			},
    			[-1, -1, -1]
    		);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*leftAvailActions*/ ctx[3] === undefined && !("leftAvailActions" in props)) {
    			console_1.warn("<App> was created without expected prop 'leftAvailActions'");
    		}

    		if (/*rightAvailActions*/ ctx[4] === undefined && !("rightAvailActions" in props)) {
    			console_1.warn("<App> was created without expected prop 'rightAvailActions'");
    		}

    		if (/*pokerBotHandWidth*/ ctx[5] === undefined && !("pokerBotHandWidth" in props)) {
    			console_1.warn("<App> was created without expected prop 'pokerBotHandWidth'");
    		}

    		if (/*heroHandWidth*/ ctx[6] === undefined && !("heroHandWidth" in props)) {
    			console_1.warn("<App> was created without expected prop 'heroHandWidth'");
    		}

    		if (/*maxBet*/ ctx[23] === undefined && !("maxBet" in props)) {
    			console_1.warn("<App> was created without expected prop 'maxBet'");
    		}

    		if (/*allIn*/ ctx[24] === undefined && !("allIn" in props)) {
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

    	get availActions() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set availActions(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get leftAvailActions() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set leftAvailActions(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get rightAvailActions() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set rightAvailActions(value) {
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

    	get activeDisplayClass() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set activeDisplayClass(value) {
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

    	get availBetsizes() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set availBetsizes(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get gameHistory() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set gameHistory(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    var app = new App({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
